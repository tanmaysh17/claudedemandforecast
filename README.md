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
This app is static and is deployed by workflow to the `gh-pages` branch.

1. Push this repository to GitHub.
2. Merge changes into `main` (or `master`).
3. In **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **gh-pages**
   - Folder: **/(root)**
4. After the deploy workflow succeeds, open:
   - `https://<your-github-username>.github.io/<your-repo-name>/`

## How to verify you are seeing the latest deployed version
The page shows a **Build** badge near the top. After each deploy, it should match the latest commit short SHA from the workflow run.

If you still see the old basic layout:
1. Confirm your latest commit is on `main`/`master` (the workflow trigger branches).
2. Open **Actions** and verify the deploy job succeeded.
3. Open **Settings → Pages** and confirm source is `gh-pages` branch.
4. Hard refresh the page (`Ctrl/Cmd + Shift + R`) or open in an incognito window.
5. Check that the loaded assets include version query strings (e.g., `styles.css?v=<sha>`).

### If checks fail quickly
If you previously had a workflow using `actions/deploy-pages`, it can fail when Pages is not configured for GitHub Actions. This repository deploys via `gh-pages` branch to avoid that dependency.

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
