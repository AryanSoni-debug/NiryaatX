import hashlib
import logging

from fastapi import HTTPException
from pydantic import ValidationError

from app.forex import predict_forex_rates
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ContractDigest,
    ContractRequest,
    ContractVerificationRequest,
    ContractVerificationResponse,
    ForexForecastResponse,
    ForexModelPayload,
    ForecastPoint,
    ForecastRequest,
    ForecastResponse,
    RouteRequest,
    RouteResponse,
)

logger = logging.getLogger(__name__)


def fetch_forex_forecast() -> ForexForecastResponse:
    try:
        payload = ForexModelPayload.model_validate(predict_forex_rates())
    except ValidationError as error:
        logger.exception("USD/INR forecast output failed validation")
        raise HTTPException(
            status_code=502,
            detail="USD/INR model produced an invalid forecast.",
        ) from error
    best_point = min(payload.forecast, key=lambda point: point.predicted_price)
    return ForexForecastResponse(
        current_price=payload.current_price,
        forecast=[point.model_dump() for point in payload.forecast],
        lowest_predicted_date=best_point.date,
        lowest_predicted_rate=best_point.predicted_price,
        explanation=(
            "The suggested date is the lowest predicted USD/INR rate in the model's "
            "returned forecast window. Predictions are uncertain and are not financial advice."
        ),
    )


def build_forecast(request: ForecastRequest) -> ForecastResponse:
    multiplier = 1 + request.change_percent_per_period / 100
    points = [
        ForecastPoint(period=period, value=round(request.baseline_value * multiplier**period, 2))
        for period in range(request.periods + 1)
    ]
    return ForecastResponse(
        explanation=(
            "Illustrative scenario calculated only from the supplied baseline and "
            "assumption; it is not a market forecast or trained-model output."
        ),
        points=points,
    )


def describe_route(request: RouteRequest) -> RouteResponse:
    return RouteResponse(
        origin=request.origin,
        destination=request.destination,
        distance_km=request.distance_km,
        mode=request.mode,
        message=(
            "Echo of caller-supplied route details only. No route was looked up, "
            "optimized, or verified."
        ),
    )


def analyze_inputs(request: AnalysisRequest) -> AnalysisResponse:
    checks = [
        f"Shipment mode supplied: {request.shipment_mode}.",
        f"Declared distance supplied: {request.distance_km:g} km.",
        f"Declared cargo weight supplied: {request.cargo_weight_kg:g} kg.",
    ]
    if request.declared_customs_value is not None:
        checks.append(
            f"Declared customs value supplied: {request.declared_customs_value:g}"
            + (f" {request.currency}." if request.currency else ".")
        )
    notes = [
        "These are input-presence checks, not a compliance, risk, or ML assessment.",
        "No live rates, duties, weather, port conditions, or external records were consulted.",
    ]
    if request.declared_customs_value is not None and not request.currency:
        notes.append("A currency code was not supplied for the declared customs value.")
    return AnalysisResponse(checks=checks, notes=notes)


def create_contract_digest(request: ContractRequest) -> ContractDigest:
    digest = hashlib.sha256(request.content.encode("utf-8")).hexdigest()
    return ContractDigest(
        contract_id=request.contract_id,
        sha256=digest,
        message=(
            "Deterministic content digest for demonstration only; this is not a "
            "signature, legal validation, or stored contract."
        ),
    )


def verify_contract_digest(
    request: ContractVerificationRequest,
) -> ContractVerificationResponse:
    actual = hashlib.sha256(request.content.encode("utf-8")).hexdigest()
    verified = actual == request.expected_sha256.lower()
    return ContractVerificationResponse(
        verified=verified,
        message=(
            "Content matches the supplied SHA-256 digest."
            if verified
            else "Content does not match the supplied SHA-256 digest."
        ),
    )
