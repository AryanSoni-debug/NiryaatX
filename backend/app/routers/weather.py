from fastapi import APIRouter

from app.schemas import ExternalDataUnavailable, LocationRequest

router = APIRouter()


@router.post("/weather", response_model=ExternalDataUnavailable)
def weather(request: LocationRequest) -> ExternalDataUnavailable:
    return ExternalDataUnavailable(
        location=request.location,
        integration_required="A trusted weather provider/API and location mapping.",
        message="Weather data is intentionally unavailable in this demo; no conditions were fabricated.",
    )
