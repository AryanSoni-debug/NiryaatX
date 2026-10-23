from fastapi import FastAPI

from app.routers import api_router

app = FastAPI(
    title="NiryaatX Backend Prototype",
    version="0.1.0",
    description=(
        "A prototype API. Responses are either deterministic demonstrations "
        "or explicitly unavailable until connected to a trusted data provider."
    ),
)
app.include_router(api_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo"}
