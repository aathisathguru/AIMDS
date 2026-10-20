"""System overview and health."""

from fastapi import APIRouter, Depends

from app.core.supabase import supabase
from app.core.security import require_user
from app.schemas import Health
from app.services.estate import store as estate
from app.services.operations import store as ops

router = APIRouter(prefix="/system", tags=["system"], dependencies=[Depends(require_user)])


@router.get("/overview", summary="Console header metrics")
def get_overview() -> dict:
    return ops.overview()


@router.get("/stats", summary="Derived estate counters")
def get_stats() -> dict:
    return ops.stats(estate.list_blocks())


@router.get("/health", response_model=Health, summary="Component health")
def get_health() -> Health:
    database_status = "operational" if not supabase.configured or supabase.connected else "degraded"
    return Health(api="operational", database=database_status, ai="operational")


@router.get("/pipeline", summary="Simulation to decision-support stages")
def get_pipeline() -> list[dict]:
    return ops.pipeline_stages
