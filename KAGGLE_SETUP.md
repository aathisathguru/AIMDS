# Kaggle dataset setup

The requested dataset is:

```text
abdallahmohamedamin/large-scale-energy-anomaly-detection-lead
```

The sandbox could not download it anonymously: Kaggle returned HTTP 403 and no Kaggle API token or connector was configured.

After configuring Kaggle credentials in the execution environment, download it with:

```bash
kaggle datasets download -d abdallahmohamedamin/large-scale-energy-anomaly-detection-lead -p data/kaggle
unzip -o data/kaggle/large-scale-energy-anomaly-detection-lead.zip -d data/kaggle/large-scale-energy-anomaly-detection-lead
```

Then inspect the files before training:

```bash
PYTHONPATH=backend backend/.venv/bin/python backend/scripts/train_hybrid.py \
  data/kaggle/large-scale-energy-anomaly-detection-lead/<verified-csv-file>.csv \
  --output-dir artifacts/hybrid
```

Do not rename columns or create labels to force a fit. The trainer detects supported numeric telemetry columns and label-like columns from the actual file, performs chronological splitting, and reports when no validated fault classifier can be trained.
