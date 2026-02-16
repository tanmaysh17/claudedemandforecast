# Demand Forecasting Web Application

A browser-based demand forecasting workbench with configurable inputs, EDA, model benchmarking, and auto model selection.

## What is now included
- Flexible CSV ingestion with selectable date and target columns.
- Robust parsing for common Excel exports: comma/semicolon/tab delimiters, Excel serial dates, and localized numeric formats (e.g., `1,234.5` or `1.234,5`).
- Data quality checks and richer EDA:
  - inferred data granularity (daily/weekly/monthly/custom)
  - observation window, mean/std, coefficient of variation
  - outlier count (z-score based) and histogram distribution
  - seasonality charts (weekday/month profile)
  - rolling-average trend view and missing period detection + imputation
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
2. Push your changes to any branch (workflow listens on all branches except `gh-pages`).
3. In **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **gh-pages**
   - Folder: **/(root)**
4. After the deploy workflow succeeds, open:
   - `https://<your-github-username>.github.io/<your-repo-name>/`

## How to verify you are seeing the latest deployed version

### Your repo quick links
- Repository: `https://github.com/tanmaysh17/claudedemandforecast`
- Actions: `https://github.com/tanmaysh17/claudedemandforecast/actions`
- Pages settings: `https://github.com/tanmaysh17/claudedemandforecast/settings/pages`
- Expected site URL: `https://tanmaysh17.github.io/claudedemandforecast/`

The page shows a **Build** badge near the top. After each deploy, it should match the latest commit short SHA from the workflow run.

If you still see the old basic layout:
1. Confirm your latest commit is on GitHub (not only local).
2. Open **Actions** and verify the "Deploy static app to GitHub Pages" job succeeded for that commit SHA.
3. Open **Settings → Pages** and confirm source is `gh-pages` branch.
4. Open **Settings → Actions → General** and set workflow permissions to **Read and write** (required for gh-pages publish).
5. Hard refresh (`Ctrl/Cmd + Shift + R`) or use an incognito tab.
6. Confirm page shows a new **Build** SHA badge and `styles.css?v=<sha>`.

If you previously had a workflow using `actions/deploy-pages`, it can fail when Pages is not configured for GitHub Actions. This repository deploys via `gh-pages` branch to avoid that dependency.

The input form also includes a **Target metric label** (for example: units, revenue, orders) so outputs and charts are clearly labeled.

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

### Manual emergency deploy
If Actions are disabled, go to **Settings → Pages** and temporarily set source to your branch (`main`/`work`) and `/(root)` to serve directly from branch files.
