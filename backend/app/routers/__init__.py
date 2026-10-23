from fastapi import APIRouter

from app.routers.analyze import router as analyze_router
from app.routers.contract import router as contract_router
from app.routers.forecast import router as forecast_router
from app.routers.port import router as port_router
from app.routers.route import router as route_router
from app.routers.weather import router as weather_router

api_router = APIRouter()
api_router.include_router(forecast_router, tags=["forecast"])
api_router.include_router(route_router, tags=["route"])
api_router.include_router(weather_router, tags=["weather"])
api_router.include_router(port_router, tags=["port"])
api_router.include_router(analyze_router, tags=["analysis"])
api_router.include_router(contract_router, tags=["contract"])
