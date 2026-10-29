from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    llm_model: str
