from datetime import datetime

from forecast import forecast_demand


def test_forecast_length_and_non_negative():
    rows = [
        (datetime(2024, 1, 1), 10),
        (datetime(2024, 1, 2), 11),
        (datetime(2024, 1, 3), 13),
        (datetime(2024, 1, 4), 12),
        (datetime(2024, 1, 5), 15),
        (datetime(2024, 1, 6), 16),
    ]
    result = forecast_demand(rows, periods=5)

    assert len(result.forecast_labels) == 5
    assert len(result.forecast_values) == 5
    assert min(result.forecast_values) >= 0


def test_single_point_forecast_repeats_last_value():
    rows = [(datetime(2024, 1, 1), 42)]
    result = forecast_demand(rows, periods=3)

    assert result.forecast_values == [42.0, 42.0, 42.0]
