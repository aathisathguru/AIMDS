"""Report history and export queueing."""

from fastapi import APIRouter, Depends, status

from app.core.security import require_user
from app.schemas import ReportExport
from app.services.operations import store as ops

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_user)])


@router.get("", summary="Previously generated reports")
def list_reports() -> list[dict]:
    return ops.list_reports()


@router.post("/export", status_code=status.HTTP_202_ACCEPTED, summary="Queue an export")
def export_report(payload: ReportExport) -> dict:
    entry = ops.record_export(payload.model_dump())
    return {
        "queued": True,
        "message": f"{entry['format']} export queued for {entry['scope']}.",
        "report": entry,
    }
