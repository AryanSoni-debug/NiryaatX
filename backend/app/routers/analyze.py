from fastapi import APIRouter

from app.schemas import AnalysisRequest, AnalysisResponse
from app.services import analyze_inputs

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest) -> AnalysisResponse:
    return analyze_inputs(request)
