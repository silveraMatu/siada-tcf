from fastapi import APIRouter

from features.health.schemas import HealthResponse
from features.health.service import get_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_health()
