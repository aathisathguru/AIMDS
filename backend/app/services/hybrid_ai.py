"""Hybrid energy-anomaly analysis using real readings only.

The service deliberately separates unsupervised anomaly detection from supervised
fault classification. A fault probability is returned only when verified labels
are present and an XGBoost model was successfully trained.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score
from sklearn.preprocessing import StandardScaler

try:  # Optional until the ML environment is provisioned.
    from xgboost import XGBClassifier
except ImportError:  # pragma: no cover
    XGBClassifier = None  # type: ignore[misc,assignment]

FEATURES = ["voltage", "current", "power", "energy", "temperature", "humidity"]
LABEL_CANDIDATES = ("fault", "fault_label", "fault_type", "label", "anomaly", "target")
MODEL_VERSION = "hybrid-energy-v1"


@dataclass
class ModelResult:
    anomaly_model: IsolationForest
    scaler: StandardScaler
    fault_model: Any | None
    feature_columns: list[str]
    label_column: str | None
    contamination: str | float
    metrics: dict[str, Any]


def _timestamp_column(frame: pd.DataFrame) -> str | None:
    for name in frame.columns:
        if str(name).lower() in {"timestamp", "time", "datetime", "date", "created_at", "received_at"}:
            return str(name)
    return None


def _label_column(frame: pd.DataFrame) -> str | None:
    for name in frame.columns:
        lower = str(name).lower()
        if lower in LABEL_CANDIDATES or any(token in lower for token in ("fault", "anomaly_label")):
            values = frame[name].dropna()
            if len(values) and values.nunique() <= max(10, int(len(values) * 0.2)):
                return str(name)
    return None


def feature_frame(rows: list[dict[str, Any]] | pd.DataFrame) -> tuple[pd.DataFrame, pd.Series | None, str | None]:
    frame = rows.copy() if isinstance(rows, pd.DataFrame) else pd.DataFrame(rows)
    if frame.empty:
        return pd.DataFrame(), None, None
    frame.columns = [str(c) for c in frame.columns]
    ts_col = _timestamp_column(frame)
    if ts_col:
        frame["__timestamp"] = pd.to_datetime(frame[ts_col], errors="coerce", utc=True)
        frame = frame.sort_values("__timestamp", kind="stable")
    hashable_cols = [
        c for c in frame.columns
        if c != "__timestamp" and not frame[c].map(lambda v: isinstance(v, (dict, list, set))).any()
    ]
    if hashable_cols:
        frame = frame.drop_duplicates(subset=hashable_cols, keep="last")
    available = [c for c in FEATURES if c in frame.columns]
    if not available:
        return pd.DataFrame(), None, None
    base = frame[available].apply(pd.to_numeric, errors="coerce")
    base = base.dropna(axis=1, how="all")
    base = base.interpolate(limit_direction="both").ffill().bfill()
    base = base.fillna(base.median(numeric_only=True)).fillna(0.0)
    engineered = base.copy()
    for col in list(base.columns):
        engineered[f"{col}_delta"] = base[col].diff().fillna(0.0)
        engineered[f"{col}_roll_mean"] = base[col].rolling(6, min_periods=2).mean().bfill().fillna(base[col])
        rolling_std = base[col].rolling(6, min_periods=2).std().bfill().fillna(0.0)
        engineered[f"{col}_roll_z"] = ((base[col] - engineered[f"{col}_roll_mean"]) / rolling_std.replace(0, np.nan)).fillna(0.0)
    label_col = _label_column(frame)
    labels = None
    if label_col:
        raw = frame[label_col]
        if pd.api.types.is_bool_dtype(raw):
            labels = raw.astype(int)
        else:
            labels = raw.astype(str).str.lower().isin({"1", "true", "yes", "fault", "anomaly", "abnormal"}).astype(int)
        labels = labels.reindex(engineered.index).fillna(0).astype(int)
    return engineered.reset_index(drop=True), labels.reset_index(drop=True) if labels is not None else None, label_col


def _chronological_split(frame: pd.DataFrame, labels: pd.Series | None):
    n = len(frame)
    if n < 12:
        raise ValueError("At least 12 chronological readings are required for validation-safe analysis.")
    train_end = max(1, int(n * 0.6))
    val_end = max(train_end + 1, int(n * 0.8))
    val_end = min(val_end, n - 1)
    return (
        frame.iloc[:train_end], frame.iloc[train_end:val_end], frame.iloc[val_end:],
        labels.iloc[:train_end] if labels is not None else None,
        labels.iloc[train_end:val_end] if labels is not None else None,
        labels.iloc[val_end:] if labels is not None else None,
    )


def _classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, scores: np.ndarray | None = None) -> dict[str, float | None]:
    result: dict[str, float | None] = {
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "false_positive_rate": float(((y_pred == 1) & (y_true == 0)).sum() / max((y_true == 0).sum(), 1)),
        "pr_auc": None,
    }
    if scores is not None and len(np.unique(y_true)) == 2:
        result["pr_auc"] = float(average_precision_score(y_true, scores))
    return result


def fit_models(rows: list[dict[str, Any]] | pd.DataFrame) -> ModelResult:
    features, labels, label_col = feature_frame(rows)
    if features.empty:
        raise ValueError("No supported numeric telemetry features were found.")
    train, validation, test, y_train, y_validation, y_test = _chronological_split(features, labels)
    scaler = StandardScaler().fit(train)
    x_train, x_val, x_test = scaler.transform(train), scaler.transform(validation), scaler.transform(test)

    contamination: str | float = "auto"
    anomaly = IsolationForest(n_estimators=250, contamination="auto", random_state=42, n_jobs=-1)
    anomaly.fit(x_train)
    anomaly_metrics: dict[str, Any] = {"mode": "unsupervised", "contamination": "auto"}

    if labels is not None and y_validation is not None and y_validation.nunique() == 2:
        candidates = (0.01, 0.03, 0.05, 0.10, 0.15)
        best_f1 = -1.0
        best_model = anomaly
        best_contamination: float = 0.05
        for candidate in candidates:
            candidate_model = IsolationForest(n_estimators=250, contamination=candidate, random_state=42, n_jobs=-1).fit(x_train)
            predicted = (candidate_model.predict(x_val) == -1).astype(int)
            score = f1_score(y_validation, predicted, zero_division=0)
            if score > best_f1:
                best_f1, best_model, best_contamination = score, candidate_model, candidate
        anomaly, contamination = best_model, best_contamination
        anomaly_metrics = {"mode": "validated", "contamination": contamination, "validation_f1": best_f1}

    val_anomaly = (anomaly.predict(x_val) == -1).astype(int)
    anomaly_scores = -anomaly.decision_function(x_val)
    if y_validation is not None:
        anomaly_metrics.update(_classification_metrics(y_validation.to_numpy(), val_anomaly, anomaly_scores))

    fault_model = None
    fault_metrics: dict[str, Any] = {"available": False, "reason": "No verified fault labels were found."}
    if XGBClassifier is not None and labels is not None and y_train is not None and y_train.nunique() == 2:
        fault_model = XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=42,
            n_jobs=2,
        )
        fault_model.fit(x_train, y_train)
        val_prob = fault_model.predict_proba(x_val)[:, 1]
        fault_metrics = {"available": True, "label_column": label_col, **_classification_metrics(y_validation.to_numpy(), (val_prob >= 0.5).astype(int), val_prob)}

    return ModelResult(anomaly, scaler, fault_model, list(features.columns), label_col, contamination, {
        "model_version": MODEL_VERSION,
        "row_count": len(features),
        "feature_columns": list(features.columns),
        "chronological_split": {"train": len(train), "validation": len(validation), "test": len(test)},
        "label_column": label_col,
        "anomaly": anomaly_metrics,
        "fault_classifier": fault_metrics,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    })


def analyze(rows: list[dict[str, Any]], model: ModelResult | None = None) -> dict[str, Any]:
    features, labels, label_col = feature_frame(rows)
    if features.empty:
        return {"status": "insufficient_data", "reason": "No supported numeric telemetry features are available.", "records": 0}
    if len(features) < 12:
        return {"status": "insufficient_data", "reason": "At least 12 readings are required for chronological validation-safe analysis.", "records": len(features)}
    model = model or fit_models(rows)
    x = model.scaler.transform(features)
    anomaly_flag = model.anomaly_model.predict(x) == -1
    raw_scores = -model.anomaly_model.decision_function(x)
    probabilities = model.fault_model.predict_proba(x)[:, 1] if model.fault_model is not None else None
    base = pd.DataFrame(rows).reset_index(drop=True)
    numeric = features.reset_index(drop=True)
    latest = numeric.iloc[-1]
    baseline = numeric.iloc[:-1].mean(numeric_only=True)
    readings: list[dict[str, Any]] = []
    for index in range(max(0, len(numeric) - 20), len(numeric)):
        risk, reason = _risk_level(bool(anomaly_flag[index]), float(probabilities[index]) if probabilities is not None else None, numeric.iloc[index], baseline)
        row = base.iloc[index].to_dict() if index < len(base) else {}
        readings.append({
            "index": index,
            "timestamp": row.get("received_at") or row.get("timestamp"),
            "device_id": row.get("device_id"),
            "risk": risk,
            "reason": reason,
            "anomaly": bool(anomaly_flag[index]),
            "anomaly_score": round(float(raw_scores[index]), 6),
            "fault_probability": round(float(probabilities[index]), 6) if probabilities is not None else None,
            "values": {key: _number(value) for key, value in numeric.iloc[index].items() if not str(key).endswith(("_delta", "_roll_mean", "_roll_z"))},
        })
    risk, reason = _risk_level(bool(anomaly_flag[-1]), float(probabilities[-1]) if probabilities is not None else None, latest, baseline)
    return {
        "status": "ready",
        "model_version": MODEL_VERSION,
        "records": len(features),
        "label_column": label_col,
        "fault_classifier_available": model.fault_model is not None,
        "risk": risk,
        "reason": reason,
        "latest": readings[-1],
        "history": readings,
        "baseline": {key: _number(value) for key, value in baseline.items() if not str(key).endswith(("_delta", "_roll_mean", "_roll_z"))},
        "metrics": model.metrics,
    }


def _number(value: Any) -> float | None:
    try:
        return round(float(value), 6) if pd.notna(value) else None
    except (TypeError, ValueError):
        return None


def _risk_level(anomalous: bool, fault_probability: float | None, latest: pd.Series, baseline: pd.Series) -> tuple[str, str]:
    deviations = []
    for key in FEATURES:
        if key in latest.index and key in baseline.index and pd.notna(latest[key]) and pd.notna(baseline[key]) and abs(float(baseline[key])) > 1e-9:
            deviations.append((abs(float(latest[key]) - float(baseline[key])) / abs(float(baseline[key])), key))
    top = max(deviations, default=(0.0, "telemetry"))
    if fault_probability is not None and fault_probability >= 0.8:
        return "critical", f"Validated classifier fault probability is {fault_probability:.1%}."
    if anomalous and top[0] >= 0.25:
        return "high", f"Isolation Forest flagged an anomaly; {top[1]} deviates {top[0]:.1%} from the historical baseline."
    if anomalous or top[0] >= 0.15:
        return "medium", f"Anomaly or sustained trend deviation detected in {top[1]} versus the historical baseline."
    return "low", "No material anomaly or validated fault risk detected in the latest reading."


def insight_cards(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = analyze(rows)
    if result.get("status") != "ready":
        return [{
            "id": "HYB-STATUS",
            "kind": "maintenance",
            "severity": "low",
            "title": "Hybrid analysis awaiting sufficient readings",
            "headline": result.get("reason", "More telemetry is required."),
            "blockName": "Live telemetry",
            "floorName": "",
            "summary": "No anomaly or fault claim is made until enough chronological readings are available for validation-safe analysis.",
            "metric": {"label": "Records", "current": result.get("records", 0), "expected": 12, "deviation": "Pending", "unit": "rows"},
            "cause": "Insufficient historical data.",
            "action": "Continue collecting real telemetry before relying on the hybrid model.",
            "confidence": 0,
            "faultProbability": None,
            "detectedAgo": "waiting",
            "modelStatus": "not_ready",
            "decision": {
                "sensorData": "Waiting for validated readings",
                "patternAnalysis": "Not available",
                "anomalyDetection": "Not run",
                "severity": "Low / not assessed",
                "cause": result.get("reason"),
                "recommendation": "Collect more telemetry",
            },
        }]
    latest = result["latest"]
    risk_map = {"critical": "high", "high": "high", "medium": "medium", "low": "low"}
    value_items = latest.get("values", {})
    baseline = result.get("baseline", {})
    metric = next((key for key in FEATURES if value_items.get(key) is not None), "power")
    current = value_items.get(metric)
    expected = baseline.get(metric)
    deviation = ((current - expected) / expected * 100) if current is not None and expected not in (None, 0) else None
    probability = latest.get("fault_probability")
    confidence = round(probability * 100) if probability is not None else 0
    return [{
        "id": "HYB-LATEST",
        "kind": "anomaly" if latest["anomaly"] else "maintenance",
        "severity": risk_map[result["risk"]],
        "title": f"{result['risk'].title()} hybrid telemetry risk",
        "headline": result["reason"],
        "blockName": latest.get("device_id") or "Live telemetry",
        "floorName": "",
        "summary": "This finding combines Isolation Forest anomaly detection with chronological baseline trends. A fault probability is shown only when verified labels trained an XGBoost classifier.",
        "metric": {"label": metric.title(), "current": current if current is not None else "—", "expected": round(expected, 3) if expected is not None else "—", "deviation": f"{deviation:+.1f}%" if deviation is not None else "—", "unit": ""},
        "cause": result["reason"],
        "action": "Inspect the affected device and compare the next readings before taking maintenance action.",
        "confidence": confidence,
        "faultProbability": probability,
        "detectedAgo": latest.get("timestamp") or "latest reading",
        "modelStatus": "xgboost_validated" if result["fault_classifier_available"] else "isolation_forest_only",
        "decision": {
            "sensorData": f"{metric}={current if current is not None else '—'}",
            "patternAnalysis": f"Baseline={expected if expected is not None else '—'}",
            "anomalyDetection": f"score={latest['anomaly_score']}",
            "severity": result["risk"].title(),
            "cause": result["reason"],
            "recommendation": "Inspect device and validate subsequent readings",
        },
    }]
