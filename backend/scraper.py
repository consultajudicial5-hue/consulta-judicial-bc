"""
Scraper for the PJBC (Poder Judicial de Baja California) judicial bulletin.
Fetches and parses HTML bulletins from the official PJBC website.
"""

from datetime import datetime, timedelta
from typing import Optional
import re

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://www.pjbc.gob.mx/boletinj/{year}/my_html/in{yy}{mm}{dd}.htm"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.pjbc.gob.mx/boletinj/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
}


async def get_boletin_html(year: str, month: str, day: str) -> Optional[str]:
    """
    Fetches the HTML content of a PJBC judicial bulletin for a given date.
    Returns None if the bulletin is not available or an error occurs.
    """
    url = BASE_URL.format(
        year=year,
        yy=year[-2:],
        mm=month.zfill(2),
        dd=day.zfill(2),
    )
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            if response.status_code == 200:
                return response.text
            return None
    except (httpx.RequestError, httpx.TimeoutException):
        return None


def parse_boletin(html: str, fecha: str) -> list[dict]:
    """
    Parses bulletin HTML and extracts judicial records.
    Returns a list of dicts with: expediente, juzgado, ciudad, fecha, acuerdo.
    """
    soup = BeautifulSoup(html, "lxml")
    results = []

    # The bulletin uses tables; each row typically contains juzgado/expediente/acuerdo
    # We look for all text blocks and try to extract structured data
    ciudad_actual = ""
    juzgado_actual = ""

    # Common city names found in bulletin headers
    ciudad_pattern = re.compile(
        r"(TIJUANA|MEXICALI|ENSENADA|TECATE|ROSARITO|PLAYAS DE ROSARITO)",
        re.IGNORECASE,
    )
    expediente_pattern = re.compile(
        r"\b(\d{1,5}/\d{4})\b|\b(\d{1,5}-\d{4})\b|\bEXP[\.\s]*(\d{1,5}/\d{4})\b",
        re.IGNORECASE,
    )

    # Try structured table parsing first
    rows = soup.find_all("tr")
    if rows:
        for row in rows:
            cells = row.find_all(["td", "th"])
            text_parts = [c.get_text(separator=" ", strip=True) for c in cells]
            full_text = " | ".join(text_parts).strip()

            if not full_text:
                continue

            # Detect city header rows
            city_match = ciudad_pattern.search(full_text)
            if city_match and len(full_text) < 80:
                ciudad_actual = city_match.group(0).title()
                if "ROSARITO" in ciudad_actual.upper() or "PLAYAS" in ciudad_actual.upper():
                    ciudad_actual = "Rosarito"
                continue

            # Detect juzgado rows
            if re.search(r"juzgado", full_text, re.IGNORECASE) and len(full_text) < 120:
                juzgado_actual = full_text.strip()
                continue

            # Detect rows with expediente numbers
            exp_match = expediente_pattern.search(full_text)
            if exp_match:
                expediente_num = exp_match.group(1) or exp_match.group(2) or exp_match.group(3)
                results.append(
                    {
                        "expediente": expediente_num,
                        "juzgado": juzgado_actual,
                        "ciudad": ciudad_actual,
                        "fecha": fecha,
                        "acuerdo": full_text,
                    }
                )
        return results

    # Fallback: flat text parsing
    full_page_text = soup.get_text(separator="\n")
    lines = [l.strip() for l in full_page_text.splitlines() if l.strip()]

    for i, line in enumerate(lines):
        city_match = ciudad_pattern.search(line)
        if city_match and len(line) < 80:
            ciudad_actual = city_match.group(0).title()
            if "ROSARITO" in ciudad_actual.upper() or "PLAYAS" in ciudad_actual.upper():
                ciudad_actual = "Rosarito"
            continue

        if re.search(r"juzgado", line, re.IGNORECASE) and len(line) < 120:
            juzgado_actual = line.strip()
            continue

        exp_match = expediente_pattern.search(line)
        if exp_match:
            expediente_num = exp_match.group(1) or exp_match.group(2) or exp_match.group(3)
            # Get surrounding context as acuerdo text (lines before + current + lines after)
            context_lines = lines[max(0, i - 1): i] + [line] + lines[i + 1: i + 3]
            acuerdo_text = " ".join(context_lines)
            results.append(
                {
                    "expediente": expediente_num,
                    "juzgado": juzgado_actual,
                    "ciudad": ciudad_actual,
                    "fecha": fecha,
                    "acuerdo": acuerdo_text,
                }
            )

    return results


def normalize(text: str) -> str:
    return text.strip().lower()


def matches_filter(record: dict, ciudad: str, juzgado: str, expediente: str) -> bool:
    """Returns True if the record matches the search filters."""
    # Expediente: exact or partial match
    exp_ok = normalize(expediente) in normalize(record.get("expediente", "")) or \
              normalize(record.get("expediente", "")) in normalize(expediente)

    # Ciudad: case-insensitive contains
    ciudad_ok = (not ciudad) or normalize(ciudad) in normalize(record.get("ciudad", ""))

    # Juzgado: case-insensitive contains
    juzgado_ok = (not juzgado) or normalize(juzgado) in normalize(record.get("juzgado", ""))

    return exp_ok and ciudad_ok and juzgado_ok


async def buscar_expediente(ciudad: str, juzgado: str, expediente: str) -> list[dict]:
    """
    Searches for an expediente in the last 7 days of PJBC bulletins.
    Returns a filtered list of matching records.
    """
    all_results: list[dict] = []
    today = datetime.now()

    for days_back in range(7):
        date = today - timedelta(days=days_back)
        year = str(date.year)
        month = str(date.month).zfill(2)
        day = str(date.day).zfill(2)
        fecha_str = date.strftime("%d/%m/%Y")

        html = await get_boletin_html(year, month, day)
        if not html:
            continue

        records = parse_boletin(html, fecha_str)
        filtered = [r for r in records if matches_filter(r, ciudad, juzgado, expediente)]
        all_results.extend(filtered)

    # Deduplicate by (expediente, fecha, acuerdo[:50])
    seen = set()
    unique_results = []
    for r in all_results:
        key = (r["expediente"], r["fecha"], r["acuerdo"][:50])
        if key not in seen:
            seen.add(key)
            unique_results.append(r)

    return unique_results
