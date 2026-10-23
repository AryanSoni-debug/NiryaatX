from fastapi import APIRouter

from app.schemas import ForexForecastResponse, ForecastRequest, ForecastResponse
from app.services import build_forecast, fetch_forex_forecast

router = APIRouter()


@router.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    return build_forecast(request)


@router.get("/forex/forecast", response_model=ForexForecastResponse)
def forex_forecast() -> ForexForecastResponse:
    return fetch_forex_forecast()
