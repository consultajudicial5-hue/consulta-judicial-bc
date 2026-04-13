from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import os

# Import real scraper if enabled, otherwise use mock data
USE_REAL_SCRAPER = os.getenv("USE_REAL_SCRAPER", "0") == "1"

if USE_REAL_SCRAPER:
    try:
        from scraper_real import PJBCScraper
        scraper = PJBCScraper()
    except ImportError:
        scraper = None
        USE_REAL_SCRAPER = False
else:
    scraper = None

app = FastAPI(title="Consulta Judicial BC API", version="1.0.0")

# CORS - allow all origins as required
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


# Mock data - 3 expedientes representativos del PJBC
MOCK_EXPEDIENTES = [
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

MOCK_DETALLES = {
    "123/2024": {
        "numero": "123/2024",
        "juzgado": "Juzgado Primero Civil de Tijuana",
        "materia": "Civil",
        "estatus": "En trámite",
        "acuerdos": [
            "Acuerdo 01 - Fecha: 2024-02-15 - Notificación realizada a las partes",
            "Acuerdo 02 - Fecha: 2024-03-05 - Audiencia convocada para el 20 de abril de 2024",
            "Acuerdo 03 - Fecha: 2024-04-10 - Ofrecimiento y admisión de pruebas",
        ],
    },
    "456/2023": {
        "numero": "456/2023",
        "juzgado": "Juzgado Segundo Penal de Mexicali",
        "materia": "Penal",
        "estatus": "Sentencia dictada",
        "acuerdos": [
            "Acuerdo 01 - Fecha: 2023-11-20 - Auto de formal prisión dictado",
            "Acuerdo 02 - Fecha: 2024-01-10 - Sentencia definitiva: condenatoria",
            "Acuerdo 03 - Fecha: 2024-02-01 - Apelación interpuesta por la defensa",
        ],
    },
    "789/2022": {
        "numero": "789/2022",
        "juzgado": "Juzgado Familiar de Ensenada",
        "materia": "Familiar",
        "estatus": "Archivado",
        "acuerdos": [
            "Acuerdo 01 - Fecha: 2022-08-01 - Contestación de demanda recibida",
            "Acuerdo 02 - Fecha: 2022-09-15 - Audiencia de conciliación celebrada",
            "Acuerdo 03 - Fecha: 2022-10-15 - Resolución de archivo definitivo",
        ],
    },
}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/expedientes", response_model=List[Expediente])
async def listar_expedientes(query: Optional[str] = Query(default="")):
    q = (query or "").strip().lower()

    if USE_REAL_SCRAPER and scraper is not None:
        try:
            results = scraper.search(q)
            return results
        except Exception:
            pass  # Fall back to mock data on scraper failure

    if not q:
        return MOCK_EXPEDIENTES

    # Simple substring match across key fields
    results = [
        item for item in MOCK_EXPEDIENTES
        if q in item["numero"].lower()
        or q in item["juzgado"].lower()
        or q in item["materia"].lower()
        or q in item["estatus"].lower()
    ]
    return results


@app.get("/api/expedientes/{numero:path}", response_model=ExpedienteDetalle)
async def obtener_expediente(numero: str):
    numero_norm = numero.strip()

    if USE_REAL_SCRAPER and scraper is not None:
        try:
            detalle = scraper.get_details(numero_norm)
            if detalle:
                return detalle
        except Exception:
            pass  # Fall back to mock data on scraper failure

    detalle = MOCK_DETALLES.get(numero_norm)
    if not detalle:
        raise HTTPException(status_code=404, detail=f"Expediente '{numero_norm}' no encontrado")
    return detalle


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
