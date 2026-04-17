"""
Monitoring router: manage and check monitored expedientes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import monitor as monitor_service

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


class MonitorAddRequest(BaseModel):
    ciudad: str
    juzgado: str
    expediente: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None


@router.get("")
async def list_monitored():
    """Returns all monitored expedientes."""
    return {"expedientes": monitor_service.listar_expedientes()}


@router.post("")
async def add_monitored(body: MonitorAddRequest):
    """Adds an expediente to the monitoring list."""
    if not body.expediente.strip():
        raise HTTPException(status_code=400, detail="El número de expediente es requerido.")
    record = monitor_service.agregar_expediente(
        ciudad=body.ciudad,
        juzgado=body.juzgado,
        expediente=body.expediente,
        email=body.email,
        whatsapp=body.whatsapp,
    )
    return {"message": "Expediente agregado al monitor.", "record": record}


@router.delete("/{exp_id}")
async def delete_monitored(exp_id: str):
    """Removes an expediente from the monitoring list."""
    removed = monitor_service.eliminar_expediente(exp_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    return {"message": "Expediente eliminado del monitor."}


@router.post("/check")
async def manual_check():
    """Triggers a manual check of all monitored expedientes."""
    changes = await monitor_service.revisar_todos()
    return {
        "message": f"Revisión completada. {len(changes)} cambio(s) encontrado(s).",
        "cambios": changes,
    }
