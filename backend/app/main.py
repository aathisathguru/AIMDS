"""
AIMDS API — application entry point.

Run locally:
    ./.venv/bin/uvicorn app.main:app --reload --port 8000

Interactive docs: http://localhost:8000/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.supabase import supabase
import asyncio
from app.routers import ai, alerts, auth, blocks, notifications, readings, reports, sensors, system, telemetry
from app.services.estate import store as estate_store
from app.services.operations import store as operations_store
from app.services.telemetry import run_realtime_telemetry_stream
from app.services.users import users as users_store


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.supabase_url and settings.supabase_service_role_key:
        supabase.connect()
        users_store.initialize_persistence()
        estate_store.initialize_persistence()
        operations_store.initialize_persistence()
    telemetry_task = asyncio.create_task(run_realtime_telemetry_stream())
    try:
        yield
    finally:
        telemetry_task.cancel()
        try:
            await telemetry_task
        except asyncio.CancelledError:
            pass
        supabase.close()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=settings.description,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (system, blocks, sensors, readings, alerts, ai, reports, auth, telemetry, notifications):
    app.include_router(router.router, prefix=settings.api_prefix)


@app.get("/", tags=["meta"], summary="Service banner")
def root() -> JSONResponse:
    return JSONResponse(
        {
            "service": settings.app_name,
            "version": settings.version,
            "docs": "/docs",
            "api": settings.api_prefix,
        }
    )


@app.get("/healthz", tags=["meta"], summary="Liveness probe")
def healthz() -> dict:
    return {"status": "ok"}
