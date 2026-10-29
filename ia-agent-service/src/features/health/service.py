from core.config import settings
from features.health.schemas import HealthResponse


def get_health() -> HealthResponse:
    return HealthResponse(status="ok", llm_model=settings.LLM_MODEL)
