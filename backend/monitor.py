"""
Monitoring system for judicial expedientes using TinyDB.
"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from tinydb import TinyDB, Query

from scraper import buscar_expediente

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "monitor.json"

db = TinyDB(str(DB_PATH))
ExpedienteQuery = Query()


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def agregar_expediente(
    ciudad: str,
    juzgado: str,
    expediente: str,
    email: Optional[str] = None,
    whatsapp: Optional[str] = None,
) -> dict:
    """Adds an expediente to the monitoring list."""
    record = {
        "id": str(uuid.uuid4()),
        "ciudad": ciudad,
        "juzgado": juzgado,
        "expediente": expediente,
        "email": email or "",
        "whatsapp": whatsapp or "",
        "ultimo_acuerdo": "",
        "ultima_revision": _now_str(),
        "activo": True,
    }
    db.insert(record)
    return record


def listar_expedientes() -> list:
    """Returns all monitored expedientes."""
    return db.all()


def eliminar_expediente(exp_id: str) -> bool:
    """Removes an expediente by its id. Returns True if found and removed."""
    removed = db.remove(ExpedienteQuery.id == exp_id)
    return len(removed) > 0


async def revisar_todos() -> list:
    """
    Runs scraper for all monitored expedientes.
    Compares with last known state and returns list of changes.
    """
    expedientes = db.all()
    changes = []

    for exp in expedientes:
        if not exp.get("activo", True):
            continue

        results = await buscar_expediente(
            exp["ciudad"], exp["juzgado"], exp["expediente"]
        )

        if not results:
            db.update(
                {"ultima_revision": _now_str()},
                ExpedienteQuery.id == exp["id"],
            )
            continue

        # Use the most recent acuerdo text
        latest_acuerdo = results[0]["acuerdo"]
        prev_acuerdo = exp.get("ultimo_acuerdo", "")

        db.update(
            {"ultimo_acuerdo": latest_acuerdo, "ultima_revision": _now_str()},
            ExpedienteQuery.id == exp["id"],
        )

        if latest_acuerdo != prev_acuerdo:
            changes.append(
                {
                    "expediente": exp["expediente"],
                    "ciudad": exp["ciudad"],
                    "juzgado": exp["juzgado"],
                    "nuevo_acuerdo": latest_acuerdo,
                    "acuerdo_anterior": prev_acuerdo,
                    "fecha_revision": _now_str(),
                }
            )

    return changes
