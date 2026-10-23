from fastapi import APIRouter

from app.schemas import RouteRequest, RouteResponse
from app.services import describe_route

router = APIRouter()


@router.post("/route", response_model=RouteResponse)
def route(request: RouteRequest) -> RouteResponse:
    return describe_route(request)
