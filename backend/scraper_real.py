import requests
from bs4 import BeautifulSoup
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOLETIN_URL = "https://www.pjbc.gob.mx/boletin_Judicial.aspx"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


class PJBCScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self._viewstate = ""
        self._eventvalidation = ""
        self._viewstate_generator = ""

    def _get_hidden_fields(self, soup: BeautifulSoup) -> None:
        vs = soup.find("input", {"id": "__VIEWSTATE"})
        ev = soup.find("input", {"id": "__EVENTVALIDATION"})
        vsg = soup.find("input", {"id": "__VIEWSTATEGENERATOR"})
        self._viewstate = vs["value"] if vs else ""
        self._eventvalidation = ev["value"] if ev else ""
        self._viewstate_generator = vsg["value"] if vsg else ""

    def _load_page(self, timeout: int = 15) -> BeautifulSoup:
        try:
            resp = self.session.get(BOLETIN_URL, timeout=timeout)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            self._get_hidden_fields(soup)
            return soup
        except requests.exceptions.RequestException as exc:
            logger.warning("Error cargando página principal: %s", exc)
            raise

    def _post_search(self, query: str, timeout: int = 15) -> BeautifulSoup:
        payload = {
            "__VIEWSTATE": self._viewstate,
            "__EVENTVALIDATION": self._eventvalidation,
            "__VIEWSTATEGENERATOR": self._viewstate_generator,
            "__EVENTTARGET": "",
            "__EVENTARGUMENT": "",
            "ctl00$ContentPlaceHolder1$txtBusqueda": query,
            "ctl00$ContentPlaceHolder1$btnBuscar": "Buscar",
        }
        try:
            resp = self.session.post(BOLETIN_URL, data=payload, timeout=timeout)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            self._get_hidden_fields(soup)
            return soup
        except requests.exceptions.RequestException as exc:
            logger.warning("Error en POST búsqueda: %s", exc)
            raise

    def _parse_table(self, soup: BeautifulSoup) -> list:
        expedientes = []
        table = soup.find("table", {"id": "ctl00_ContentPlaceHolder1_gvExpedientes"})
        if not table:
            table = soup.find("table", class_="GridView")
        if not table:
            tables = soup.find_all("table")
            for t in tables:
                headers = [th.get_text(strip=True).lower() for th in t.find_all("th")]
                if any(h in headers for h in ["expediente", "número", "juzgado", "materia"]):
                    table = t
                    break
        if not table:
            logger.info("No se encontró tabla de resultados en la respuesta.")
            return []

        rows = table.find_all("tr")
        if not rows:
            return []

        header_cells = rows[0].find_all(["th", "td"])
        header_text = [c.get_text(strip=True).lower() for c in header_cells]

        def find_col(names):
            for n in names:
                for i, h in enumerate(header_text):
                    if n in h:
                        return i
            return None

        col_numero = find_col(["número", "numero", "expediente", "no."])
        col_juzgado = find_col(["juzgado", "tribunal"])
        col_materia = find_col(["materia", "tipo"])
        col_estatus = find_col(["estatus", "estado", "situacion", "situación"])

        for row in rows[1:]:
            cells = row.find_all("td")
            if not cells:
                continue
            try:
                numero = cells[col_numero].get_text(strip=True) if col_numero is not None and col_numero < len(cells) else ""
                juzgado = cells[col_juzgado].get_text(strip=True) if col_juzgado is not None and col_juzgado < len(cells) else ""
                materia = cells[col_materia].get_text(strip=True) if col_materia is not None and col_materia < len(cells) else ""
                estatus = cells[col_estatus].get_text(strip=True) if col_estatus is not None and col_estatus < len(cells) else ""
                if numero or juzgado:
                    expedientes.append({
                        "numero": numero,
                        "juzgado": juzgado,
                        "materia": materia,
                        "estatus": estatus,
                    })
            except (IndexError, AttributeError) as exc:
                logger.debug("Error parseando fila: %s", exc)
                continue

        return expedientes

    def search(self, query: str) -> list:
        logger.info("Iniciando búsqueda real en PJBC para query: %s", query)
        try:
            self._load_page()
            time.sleep(0.5)
            soup = self._post_search(query)
            results = self._parse_table(soup)
            logger.info("Resultados obtenidos del sitio real: %d", len(results))
            return results
        except Exception as exc:
            logger.error("Fallo en scraper real: %s", exc)
            raise


_scraper_instance = None


def get_scraper() -> PJBCScraper:
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = PJBCScraper()
    return _scraper_instance


def search_expedientes(query: str) -> list:
    scraper = get_scraper()
    return scraper.search(query)
