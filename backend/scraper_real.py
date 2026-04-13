# backend/scraper_real.py
"""
Scraper para el Boletín Judicial del Poder Judicial de Baja California (PJBC).
Maneja __VIEWSTATE y postbacks de ASP.NET WebForms.
Usa cloudscraper automáticamente si está disponible (para bypass de Cloudflare).
"""

import time
import logging
from typing import List, Dict, Any, Optional

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PJBC_BASE_URL = "https://www.pjbc.gob.mx/boletin_Judicial.aspx"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

MAX_RETRIES = 3
BACKOFF_FACTOR = 2


def _make_session() -> requests.Session:
    """Creates a requests session with or without cloudscraper support."""
    if HAS_CLOUDSCRAPER:
        logger.info("cloudscraper available — using it to bypass Cloudflare protection.")
        session = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
    else:
        logger.info("cloudscraper not available — using standard requests session.")
        session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    return session


def _get_with_retry(session: requests.Session, url: str, method: str = "GET", **kwargs) -> requests.Response:
    """GET or POST with exponential backoff retries."""
    delay = 1
    last_exc: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if method.upper() == "POST":
                resp = session.post(url, timeout=20, **kwargs)
            else:
                resp = session.get(url, timeout=20, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            logger.warning("Attempt %d/%d failed: %s — retrying in %ds", attempt, MAX_RETRIES, exc, delay)
            time.sleep(delay)
            delay *= BACKOFF_FACTOR
    raise RuntimeError(f"All {MAX_RETRIES} attempts failed. Last error: {last_exc}") from last_exc


def _extract_viewstate(soup: BeautifulSoup) -> Dict[str, str]:
    """Extracts ASP.NET hidden form fields (__VIEWSTATE, __EVENTVALIDATION, etc.)."""
    fields = {}
    for field_name in ("__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION", "__EVENTTARGET", "__EVENTARGUMENT"):
        tag = soup.find("input", {"name": field_name})
        if tag:
            fields[field_name] = tag.get("value", "")
    return fields


def _parse_results_table(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    """Parses the results table from the PJBC boletín page."""
    results: List[Dict[str, Any]] = []

    # Try to find a table that contains expedition data
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        header_cells = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
        # Identify the results table by expected column names
        if not any(kw in " ".join(header_cells) for kw in ("expediente", "juzgado", "materia", "actor", "numero")):
            continue
        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) < 3:
                continue
            # Map columns heuristically
            expediente: Dict[str, Any] = {
                "numero": cells[0] if len(cells) > 0 else "",
                "juzgado": cells[1] if len(cells) > 1 else "",
                "materia": cells[2] if len(cells) > 2 else "",
                "estatus": cells[3] if len(cells) > 3 else "Sin información",
            }
            if expediente["numero"]:
                results.append(expediente)
        if results:
            break

    return results


def _parse_detail_page(soup: BeautifulSoup, numero: str) -> Optional[Dict[str, Any]]:
    """Parses the detail page for a single expediente, extracting acuerdos."""
    detalle: Dict[str, Any] = {
        "numero": numero,
        "juzgado": "",
        "materia": "",
        "estatus": "Sin información",
        "acuerdos": [],
    }

    # Look for header/detail fields in spans, labels or table cells
    for tag in soup.find_all(["span", "label", "td"]):
        text = tag.get_text(strip=True)
        if "juzgado" in text.lower() and not detalle["juzgado"]:
            next_sib = tag.find_next_sibling()
            if next_sib:
                detalle["juzgado"] = next_sib.get_text(strip=True)
        if "materia" in text.lower() and not detalle["materia"]:
            next_sib = tag.find_next_sibling()
            if next_sib:
                detalle["materia"] = next_sib.get_text(strip=True)
        if "estatus" in text.lower() or "estado" in text.lower():
            next_sib = tag.find_next_sibling()
            if next_sib:
                detalle["estatus"] = next_sib.get_text(strip=True)

    # Parse acuerdos table
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if cells:
                acuerdo_text = " - ".join(c for c in cells if c)
                if acuerdo_text:
                    detalle["acuerdos"].append(acuerdo_text)

    return detalle if (detalle["juzgado"] or detalle["acuerdos"]) else None


class PJBCScraper:
    """
    Scraper for the PJBC Boletín Judicial.
    Handles ASP.NET ViewState form postbacks and optional Cloudflare bypass.
    """

    def __init__(self, base_url: str = PJBC_BASE_URL):
        self.base_url = base_url
        self.session = _make_session()
        self._viewstate_cache: Dict[str, str] = {}

    def _load_initial_page(self) -> BeautifulSoup:
        """Loads the initial page and caches the ViewState fields."""
        logger.info("Loading initial PJBC page: %s", self.base_url)
        resp = _get_with_retry(self.session, self.base_url)
        soup = BeautifulSoup(resp.text, "lxml")
        self._viewstate_cache = _extract_viewstate(soup)
        logger.debug("ViewState fields captured: %s", list(self._viewstate_cache.keys()))
        return soup

    def _build_search_payload(self, query: str) -> Dict[str, str]:
        """Builds the ASP.NET postback form payload for a search query."""
        payload = dict(self._viewstate_cache)
        payload.update({
            "__EVENTTARGET": "",
            "__EVENTARGUMENT": "",
            # Common ASP.NET button and search field names on PJBC — adjust if needed
            "ctl00$ContentPlaceHolder1$txtBusqueda": query,
            "ctl00$ContentPlaceHolder1$btnBuscar": "Buscar",
        })
        return payload

    def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for expedientes on the PJBC boletín.
        Returns a list of dicts with keys: numero, juzgado, materia, estatus.
        Falls back to empty list on any error.
        """
        if not query or len(query.strip()) < 2:
            return []

        try:
            self._load_initial_page()
        except Exception as exc:
            logger.error("Failed to load initial page: %s", exc)
            return []

        payload = self._build_search_payload(query.strip())
        logger.info("Submitting search for: %s", query)

        try:
            resp = _get_with_retry(
                self.session,
                self.base_url,
                method="POST",
                data=payload,
                headers={"Referer": self.base_url, "Content-Type": "application/x-www-form-urlencoded"},
            )
        except Exception as exc:
            logger.error("Search POST failed: %s", exc)
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = _parse_results_table(soup)
        logger.info("Found %d result(s) for query '%s'", len(results), query)
        return results

    def get_details(self, numero: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves detailed information for a specific expediente number.
        Returns a dict with keys: numero, juzgado, materia, estatus, acuerdos.
        Returns None if not found.
        """
        try:
            self._load_initial_page()
        except Exception as exc:
            logger.error("Failed to load initial page for detail: %s", exc)
            return None

        payload = self._build_search_payload(numero.strip())
        logger.info("Fetching details for expediente: %s", numero)

        try:
            resp = _get_with_retry(
                self.session,
                self.base_url,
                method="POST",
                data=payload,
                headers={"Referer": self.base_url, "Content-Type": "application/x-www-form-urlencoded"},
            )
        except Exception as exc:
            logger.error("Detail POST failed for %s: %s", numero, exc)
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        detalle = _parse_detail_page(soup, numero)
        if detalle is None:
            logger.warning("No detail data parsed for expediente: %s", numero)
        return detalle
