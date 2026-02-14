from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timedelta
from io import StringIO


@dataclass
class ForecastResult:
    history_labels: list[str]
    history_values: list[float]
    forecast_labels: list[str]
    forecast_values: list[float]


def parse_csv(csv_text: str) -> list[tuple[datetime, float]]:
    reader = csv.DictReader(StringIO(csv_text))
    if not reader.fieldnames or "date" not in reader.fieldnames or "demand" not in reader.fieldnames:
        raise ValueError("CSV must include date and demand columns.")

    rows: list[tuple[datetime, float]] = []
    for row in reader:
        try:
            d = datetime.fromisoformat((row.get("date") or "").strip())
            demand = float((row.get("demand") or "").strip())
            rows.append((d, demand))
        except ValueError:
            continue

    rows.sort(key=lambda x: x[0])
    if not rows:
        raise ValueError("No valid rows found after parsing date and demand.")
    return rows


def _linear_forecast(values: list[float], periods: int) -> list[float]:
    n = len(values)
    if n == 1:
        return [round(max(values[0], 0.0), 2)] * periods

    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    intercept = y_mean - slope * x_mean

    forecasts: list[float] = []
    for i in range(n, n + periods):
        yhat = slope * i + intercept
        forecasts.append(round(max(yhat, 0.0), 2))
    return forecasts


def forecast_demand(rows: list[tuple[datetime, float]], periods: int = 14) -> ForecastResult:
    if periods < 1:
        raise ValueError("periods must be positive")

    dates = [d for d, _ in rows]
    values = [v for _, v in rows]
    forecast_values = _linear_forecast(values, periods)

    last_date = dates[-1]
    forecast_dates = [last_date + timedelta(days=i) for i in range(1, periods + 1)]

    return ForecastResult(
        history_labels=[d.strftime("%Y-%m-%d") for d in dates],
        history_values=[round(v, 2) for v in values],
        forecast_labels=[d.strftime("%Y-%m-%d") for d in forecast_dates],
        forecast_values=forecast_values,
    )
