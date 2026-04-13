from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Consulta Judicial BC API",
    description="API para consultar expedientes del Poder Judicial de Baja California.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Expediente(BaseModel):
    numero: str
    juzgado: str
    materia: str
    estatus: str


class ExpedienteDetalle(Expediente):
    acuerdos: List[str] = []


FALLBACK_EXPEDIENTES = [
    {
        "numero": "123/2024",
        "juzgado": "Juzgado Primero Civil de Tijuana",
        "materia": "Civil",
        "estatus": "En trámite",
    },
    {
        "numero": "456/2023",
        "juzgado": "Juzgado Segundo Penal de Mexicali",
        "materia": "Penal",
        "estatus": "Sentencia dictada",
    },
    {
        "numero": "789/2022",
        "juzgado": "Juzgado Familiar de Ensenada",
        "materia": "Familiar",
        "estatus": "Archivado",
    },
]

FALLBACK_DETALLES = {
    "123/2024": {
        "numero": "123/2024",
        "juzgado": "Juzgado Primero Civil de Tijuana",
        "materia": "Civil",
        "estatus": "En trámite",
        "acuerdos": [
            "Acuerdo 01 — 2024-02-15 — Notificación realizada a las partes",
            "Acuerdo 02 — 2024-03-05 — Audiencia convocada para el 20 de marzo",
        ],
    },
    "456/2023": {
        "numero": "456/2023",
        "juzgado": "Juzgado Segundo Penal de Mexicali",
        "materia": "Penal",
        "estatus": "Sentencia dictada",
        "acuerdos": [
            "Acuerdo 01 — 2023-11-20 — Auto de formal prisión dictado",
            "Acuerdo 02 — 2024-01-10 — Sentencia definitiva publicada",
        ],
    },
    "789/2022": {
        "numero": "789/2022",
        "juzgado": "Juzgado Familiar de Ensenada",
        "materia": "Familiar",
        "estatus": "Archivado",
        "acuerdos": [
            "Acuerdo 01 — 2022-08-01 — Contestación de demanda recibida",
            "Acuerdo 02 — 2022-10-15 — Resolución de archivo definitivo",
        ],
    },
}


def _filter_fallback(query: str) -> List[dict]:
    q = query.strip().lower()
    if not q:
        return FALLBACK_EXPEDIENTES
    return [
        item for item in FALLBACK_EXPEDIENTES
        if q in item["numero"].lower()
        or q in item["juzgado"].lower()
        or q in item["materia"].lower()
        or q in item["estatus"].lower()
    ]


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/expedientes", response_model=List[Expediente])
async def listar_expedientes(query: Optional[str] = Query(default="", alias="query")):
    q = (query or "").strip()
    try:
        from scraper_real import search_expedientes
        results = search_expedientes(q if q else "expediente")
        if results:
            logger.info("Devolviendo %d resultados del scraper real.", len(results))
            return results
        logger.info("Scraper real no devolvió resultados, usando fallback.")
        return _filter_fallback(q)
    except Exception as exc:
        logger.warning("Scraper real falló (%s), usando datos de ejemplo.", exc)
        return _filter_fallback(q)


@app.get("/api/expedientes/{numero}", response_model=ExpedienteDetalle)
async def obtener_expediente(numero: str):
    numero_norm = numero.strip()
    detalle = FALLBACK_DETALLES.get(numero_norm)
    if detalle:
        return detalle
    raise HTTPException(
        status_code=404,
        detail=f"Expediente '{numero_norm}' no encontrado.",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
