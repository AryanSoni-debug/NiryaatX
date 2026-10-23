from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ForecastRequest(StrictSchema):
    baseline_value: float = Field(ge=0, description="User-supplied baseline; no market data is fetched.")
    periods: int = Field(default=3, ge=1, le=24)
    change_percent_per_period: float = Field(
        default=0, ge=-100, le=100, description="User-supplied scenario assumption."
    )


class ForecastPoint(StrictSchema):
    period: int
    value: float


class ForecastResponse(StrictSchema):
    status: Literal["demo"] = "demo"
    source: Literal["deterministic_user_input_scenario"] = "deterministic_user_input_scenario"
    is_live_data: Literal[False] = False
    is_ml_prediction: Literal[False] = False
    explanation: str
    points: list[ForecastPoint]


class ForexModelPrediction(BaseModel):
    date: date
    predicted_price: float = Field(gt=0, allow_inf_nan=False)


class ForexModelPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Literal["success"]
    currency_pair: Literal["INR=X", "USD/INR"]
    current_price: float = Field(gt=0, allow_inf_nan=False)
    forecast: list[ForexModelPrediction] = Field(min_length=1, max_length=365)

    @model_validator(mode="after")
    def forecast_dates_are_ordered(self):
        dates = [point.date for point in self.forecast]
        if dates != sorted(set(dates)):
            raise ValueError("Forecast dates must be unique and in ascending order.")
        return self


class ForexForecastPoint(StrictSchema):
    date: date
    predicted_price: float = Field(gt=0, allow_inf_nan=False)


class ForexForecastResponse(StrictSchema):
    status: Literal["model_forecast"] = "model_forecast"
    source: Literal["configured_hybrid_lstm_xgboost_api"] = "configured_hybrid_lstm_xgboost_api"
    is_ml_prediction: Literal[True] = True
    currency_pair: Literal["USD/INR"] = "USD/INR"
    current_price: float = Field(gt=0, allow_inf_nan=False)
    forecast: list[ForexForecastPoint] = Field(min_length=1)
    lowest_predicted_date: date
    lowest_predicted_rate: float = Field(gt=0, allow_inf_nan=False)
    explanation: str


class RouteRequest(StrictSchema):
    origin: str = Field(min_length=1, max_length=120)
    destination: str = Field(min_length=1, max_length=120)
    distance_km: float = Field(gt=0, le=100_000, description="Distance supplied by the caller.")
    mode: Literal["road", "rail", "sea", "air"]

    @field_validator("origin", "destination")
    @classmethod
    def strip_location(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Location must not be blank.")
        return value

    @field_validator("destination")
    @classmethod
    def distinct_from_origin(cls, value: str, info) -> str:
        origin = info.data.get("origin")
        if origin and origin.casefold() == value.casefold():
            raise ValueError("Origin and destination must be different.")
        return value


class RouteResponse(StrictSchema):
    status: Literal["demo"] = "demo"
    source: Literal["caller_supplied_distance"] = "caller_supplied_distance"
    is_live_route: Literal[False] = False
    origin: str
    destination: str
    distance_km: float
    mode: str
    message: str


class LocationRequest(StrictSchema):
    location: str = Field(min_length=1, max_length=160)

    @field_validator("location")
    @classmethod
    def nonblank_location(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Location must not be blank.")
        return value


class ExternalDataUnavailable(StrictSchema):
    status: Literal["unavailable"] = "unavailable"
    location: str
    data: None = None
    integration_required: str
    message: str


class AnalysisRequest(StrictSchema):
    cargo_weight_kg: float = Field(gt=0, le=1_000_000)
    distance_km: float = Field(gt=0, le=100_000)
    shipment_mode: Literal["road", "rail", "sea", "air"]
    declared_customs_value: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class AnalysisResponse(StrictSchema):
    status: Literal["demo"] = "demo"
    source: Literal["deterministic_input_checks"] = "deterministic_input_checks"
    is_ml_analysis: Literal[False] = False
    checks: list[str]
    notes: list[str]


class ContractRequest(StrictSchema):
    contract_id: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=100_000)

    @field_validator("contract_id", "content")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Value must not be blank.")
        return value


class ContractDigest(StrictSchema):
    contract_id: str
    sha256: str
    status: Literal["demo_digest"] = "demo_digest"
    message: str


class ContractVerificationRequest(StrictSchema):
    content: str = Field(min_length=1, max_length=100_000)
    expected_sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")

    @field_validator("content")
    @classmethod
    def reject_blank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Contract content must not be blank.")
        return value


class ContractVerificationResponse(StrictSchema):
    verified: bool
    status: Literal["demo_integrity_check"] = "demo_integrity_check"
    message: str
