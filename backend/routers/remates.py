"""
Remates router: search for remates, subastas, and adjudicaciones in the bulletin.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query

from scraper import get_boletin_html, parse_boletin

router = APIRouter(prefix="/api/remates", tags=["remates"])

REMATE_KEYWORDS = {
    "remate": "remate",
    "subasta": "subasta",
    "adjudicación": "adjudicación",
    "adjudicacion": "adjudicación",
    "licitación": "subasta",
    "licitacion": "subasta",
}


def detect_tipo(text: str) -> Optional[str]:
    text_lower = text.lower()
    for keyword, tipo in REMATE_KEYWORDS.items():
        if keyword in text_lower:
            return tipo
    return None


@router.get("")
async def get_remates(
    ciudad: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """
    Returns remates, subastas, and adjudicaciones found in recent bulletins.
    Optionally filtered by ciudad and date range.
    """
    today = datetime.now()
    results = []

    # Default: last 7 days
    days_to_check = 7
    start_date = None
    end_date = None

    if fecha_inicio:
        try:
            start_date = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        except ValueError:
            pass

    if fecha_fin:
        try:
            end_date = datetime.strptime(fecha_fin, "%Y-%m-%d")
        except ValueError:
            pass

    for days_back in range(days_to_check):
        date = today - timedelta(days=days_back)

        if start_date and date.date() < start_date.date():
            continue
        if end_date and date.date() > end_date.date():
            continue

        year = str(date.year)
        month = str(date.month).zfill(2)
        day = str(date.day).zfill(2)
        fecha_str = date.strftime("%d/%m/%Y")

        html = await get_boletin_html(year, month, day)
        if not html:
            continue

        records = parse_boletin(html, fecha_str)

        for record in records:
            tipo = detect_tipo(record["acuerdo"])
            if not tipo:
                continue

            if ciudad and ciudad.lower() not in record.get("ciudad", "").lower():
                continue

            results.append(
                {
                    "expediente": record["expediente"],
                    "juzgado": record["juzgado"],
                    "ciudad": record["ciudad"],
                    "fecha": record["fecha"],
                    "texto": record["acuerdo"],
                    "tipo": tipo,
                }
            )

    # Deduplicate
    seen = set()
    unique = []
    for r in results:
        key = (r["expediente"], r["fecha"], r["tipo"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return {"remates": unique, "total": len(unique)}
