"""
FastAPI entry point for Consulta Judicial BC backend.
"""

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import search, analyze, monitoring, documents, remates
import monitor as monitor_service


scheduler = AsyncIOScheduler()


async def daily_check_job():
    """APScheduler job: check all monitored expedientes daily at 10am Mexico time."""
    await monitor_service.revisar_todos()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler on app startup
    scheduler.add_job(
        daily_check_job,
        CronTrigger(hour=10, minute=0, timezone="America/Tijuana"),
        id="daily_monitor_check",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="Consulta Judicial BC API",
    description="API para consulta del boletín judicial de Baja California",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(analyze.router)
app.include_router(monitoring.router)
app.include_router(documents.router)
app.include_router(remates.router)


@app.get("/")
async def root():
    return {"message": "Consulta Judicial BC API", "status": "online"}
