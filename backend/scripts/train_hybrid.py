#!/usr/bin/env python3
"""Train the AIMDS hybrid model from a real CSV export.

Usage:
  python backend/scripts/train_hybrid.py data/dataset.csv --output-dir artifacts/hybrid

The script refuses to invent labels. If no reliable label-like column is present,
only Isolation Forest is trained and the report explicitly records that limitation.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd

from app.services.hybrid_ai import fit_models


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/hybrid"))
    args = parser.parse_args()
    if not args.csv.is_file():
        raise SystemExit(f"Dataset not found: {args.csv}")
    frame = pd.read_csv(args.csv)
    model = fit_models(frame)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.output_dir / "hybrid_model.joblib")
    (args.output_dir / "model_metadata.json").write_text(json.dumps(model.metrics, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"artifact": str(args.output_dir / "hybrid_model.joblib"), **model.metrics}, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
