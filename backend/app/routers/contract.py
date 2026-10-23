from fastapi import APIRouter

from app.schemas import (
    ContractDigest,
    ContractRequest,
    ContractVerificationRequest,
    ContractVerificationResponse,
)
from app.services import create_contract_digest, verify_contract_digest

router = APIRouter()


@router.post("/contract", response_model=ContractDigest)
def contract(request: ContractRequest) -> ContractDigest:
    return create_contract_digest(request)


@router.post("/contract/verify", response_model=ContractVerificationResponse)
def verify_contract(
    request: ContractVerificationRequest,
) -> ContractVerificationResponse:
    return verify_contract_digest(request)
