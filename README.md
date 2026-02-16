# Demand Forecasting Web Application

A browser-based demand forecasting workbench with configurable inputs, EDA, model benchmarking, and auto model selection.

## What is now included
- Flexible CSV ingestion with selectable date and target columns.
- Data quality checks and EDA metrics:
  - observation window, mean/std, coefficient of variation
  - outlier count (z-score based)
  - missing period detection + imputation
- Multi-model benchmark on a validation holdout:
  - Holt linear trend
  - Seasonal naive
  - Trend + seasonal index model
- Automatic model selection (or manual override).
- Forecast visualization with model annotation.

## Run locally
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Run on the web (GitHub Pages)
This app is static, so it deploys directly with the existing GitHub Pages workflow.

1. Push this repository to GitHub.
2. Merge changes into `main`.
3. In **Settings → Pages**, set source to **GitHub Actions**.
4. After workflow success, open:
   - `https://<your-github-username>.github.io/<your-repo-name>/`

## CSV example
```csv
date,demand
2024-01-01,100
2024-01-02,110
2024-01-03,95
```

## Optional Python utility tests
```bash
PYTHONPATH=. pytest -q
```
