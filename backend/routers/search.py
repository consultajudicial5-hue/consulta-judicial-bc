"""
Search router: expediente lookup and cities/juzgados catalog.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from scraper import buscar_expediente

router = APIRouter(prefix="/api", tags=["search"])

CITIES_JUZGADOS = {
    "Tijuana": [
        "Juzgado Primero Civil",
        "Juzgado Segundo Civil",
        "Juzgado Tercero Civil",
        "Juzgado Cuarto Civil",
        "Juzgado Quinto Civil",
        "Juzgado Primero Familiar",
        "Juzgado Segundo Familiar",
        "Juzgado Primero Mercantil",
        "Juzgado Segundo Mercantil",
    ],
    "Mexicali": [
        "Juzgado Primero Civil",
        "Juzgado Segundo Civil",
        "Juzgado Tercero Civil",
        "Juzgado Primero Familiar",
        "Juzgado Segundo Familiar",
        "Juzgado Primero Mercantil",
    ],
    "Ensenada": [
        "Juzgado Primero Civil",
        "Juzgado Segundo Civil",
        "Juzgado Primero Familiar",
    ],
    "Tecate": ["Juzgado Único Civil"],
    "Rosarito": ["Juzgado Único Civil"],
}


class SearchRequest(BaseModel):
    ciudad: str
    juzgado: str
    expediente: str


@router.post("/search")
async def search_expediente(body: SearchRequest):
    """Search for an expediente in the last 7 days of PJBC bulletins."""
    if not body.expediente.strip():
        raise HTTPException(status_code=400, detail="El número de expediente es requerido.")
    results = await buscar_expediente(body.ciudad, body.juzgado, body.expediente)
    return {"results": results, "total": len(results)}


@router.get("/cities")
async def get_cities():
    """Returns the catalog of cities and their juzgados."""
    return CITIES_JUZGADOS
