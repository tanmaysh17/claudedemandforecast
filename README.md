# Demand Forecasting Web Application

A lightweight web app for uploading historical demand data and generating a short-term forecast.

## Features
- CSV upload (`date`, `demand` columns)
- Adjustable forecast horizon
- Historical + forecast chart output
- Linear-trend forecasting baseline in browser JavaScript

## Run locally
```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Run on the web (GitHub Pages)
This project is static (`index.html`, `script.js`, `styles.css`), so it can be hosted directly on GitHub Pages.

### 1) Put the repo on GitHub
Push this branch to your GitHub repository.

### 2) Merge to `main`
The workflow in `.github/workflows/deploy-pages.yml` runs on pushes to `main`.

### 3) Enable Pages in repo settings
In GitHub: **Settings → Pages → Build and deployment**
- Source: **GitHub Actions**

### 4) Visit your live app
After the workflow succeeds, your app will be available at:
- `https://<your-github-username>.github.io/<your-repo-name>/`

## CSV format
```csv
date,demand
2024-01-01,100
2024-01-02,110
2024-01-03,95
```

## Optional Python forecast utility tests
```bash
PYTHONPATH=. pytest -q
```
