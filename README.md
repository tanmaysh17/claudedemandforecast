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
