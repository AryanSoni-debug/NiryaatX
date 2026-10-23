from fastapi.testclient import TestClient

from app import services
from app.main import app

client = TestClient(app)


def test_forecast_is_explicitly_demo_and_uses_user_assumptions() -> None:
    response = client.post(
        "/forecast",
        json={"baseline_value": 100, "periods": 2, "change_percent_per_period": 10},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "demo"
    assert payload["is_live_data"] is False
    assert [point["value"] for point in payload["points"]] == [100, 110, 121]


def test_forex_forecast_returns_lowest_model_prediction(monkeypatch) -> None:
    payload = {
        "status": "success",
        "currency_pair": "INR=X",
        "current_price": 94.8,
        "forecast": [
            {"date": "2026-10-23", "predicted_price": 94.6},
            {"date": "2026-10-26", "predicted_price": 94.2},
            {"date": "2026-10-27", "predicted_price": 94.4},
        ],
    }
    monkeypatch.setattr(services, "predict_forex_rates", lambda: payload)

    response = client.get("/forex/forecast")

    assert response.status_code == 200
    result = response.json()
    assert result["is_ml_prediction"] is True
    assert result["lowest_predicted_date"] == "2026-10-26"
    assert result["lowest_predicted_rate"] == 94.2
    assert len(result["forecast"]) == 3


def test_forex_forecast_reports_unavailable_model_artifacts(monkeypatch) -> None:
    from fastapi import HTTPException

    def raise_unavailable():
        raise HTTPException(status_code=503, detail="Model artifacts are missing.")

    monkeypatch.setattr(services, "predict_forex_rates", raise_unavailable)
    response = client.get("/forex/forecast")

    assert response.status_code == 503
    assert "artifacts are missing" in response.json()["detail"]


def test_forex_forecast_rejects_invalid_model_output(monkeypatch) -> None:
    monkeypatch.setattr(
        services,
        "predict_forex_rates",
        lambda: {"status": "success", "forecast": []},
    )

    response = client.get("/forex/forecast")

    assert response.status_code == 502
    assert response.json()["detail"] == "USD/INR model produced an invalid forecast."


def test_route_rejects_identical_locations() -> None:
    response = client.post(
        "/route",
        json={"origin": "Delhi", "destination": "delhi", "distance_km": 20, "mode": "road"},
    )

    assert response.status_code == 422


def test_weather_and_port_do_not_fabricate_data() -> None:
    weather = client.post("/weather", json={"location": "Mumbai"})
    port = client.post("/port", json={"location": "Mumbai"})

    assert weather.status_code == port.status_code == 200
    assert weather.json()["data"] is None
    assert port.json()["data"] is None
    assert weather.json()["status"] == port.json()["status"] == "unavailable"


def test_contract_digest_verification_detects_changed_content() -> None:
    digest_response = client.post(
        "/contract", json={"contract_id": "sample-1", "content": "example terms"}
    )
    digest = digest_response.json()["sha256"]

    valid = client.post(
        "/contract/verify",
        json={"content": "example terms", "expected_sha256": digest},
    )
    invalid = client.post(
        "/contract/verify",
        json={"content": "changed terms", "expected_sha256": digest},
    )

    assert valid.json()["verified"] is True
    assert invalid.json()["verified"] is False
