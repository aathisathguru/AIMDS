"""AI insights and the decision-support chain."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_user
from app.services.hybrid_ai import analyze, insight_cards
from app.services.operations import store as ops
from app.services.telemetry import telemetry

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_user)])


@router.get("/insights", summary="Structured insight cards")
def list_insights(
    kind: str = Query(default="all"),
    severity: str = Query(default="all"),
) -> list[dict]:
    return ops.list_insights(kind=kind, severity=severity)


@router.get("/decision-flow", summary="Sensor data to recommendation stages")
def decision_flow() -> list[dict]:
    return ops.decision_stages


@router.get("/insights/{insight_id}", summary="One insight")
def get_insight(insight_id: str) -> dict:
    insight = ops.get_insight(insight_id.upper())
    if insight is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Insight {insight_id} not found")
    return insight


@router.get("/hybrid/summary", summary="Validated hybrid anomaly and fault-risk summary")
def hybrid_summary() -> dict:
    return analyze(telemetry.history(limit=500))


@router.get("/hybrid/history", summary="Recent hybrid risk decisions")
def hybrid_history(limit: int = Query(default=50, ge=1, le=500)) -> list[dict]:
    summary = analyze(telemetry.history(limit=500))
    return summary.get("history", [])[-limit:]


@router.post("/hybrid/retrain", summary="Rebuild the hybrid model from historical readings")
def retrain_hybrid() -> dict:
    rows = telemetry.history(limit=500)
    summary = analyze(rows)
    summary["insights"] = insight_cards(rows)
    return summary
