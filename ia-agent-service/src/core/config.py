from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_PROYECTO: Path = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=RAIZ_PROYECTO / ".env", extra="ignore")

    LLM_API_KEY: str
    LLM_BASE_URL: str = "https://ollama.com/v1"
    LLM_MODEL: str = "nemotron-3-nano:30b-cloud"
    LLM_TIMEOUT_SECONDS: float = 60.0
    ENVIRONMENT: str = "development"
    SERVICE_API_KEY: str = Field(min_length=32)


settings: Settings = Settings()  # type: ignore[call-arg]  # las claves vienen del entorno
