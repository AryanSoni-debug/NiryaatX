from fastapi import APIRouter

from app.schemas import ExternalDataUnavailable, LocationRequest

router = APIRouter()


@router.post("/port", response_model=ExternalDataUnavailable)
def port(request: LocationRequest) -> ExternalDataUnavailable:
    return ExternalDataUnavailable(
        location=request.location,
        integration_required="A trusted port-operations/traffic provider and port identifier mapping.",
        message="Port data is intentionally unavailable in this demo; no status or congestion data was fabricated.",
    )
