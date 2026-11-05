from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_PROYECTO: Path = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=RAIZ_PROYECTO / ".env", extra="ignore")

    LLM_API_KEY: str
    LLM_BASE_URL: str = "https://ollama.com/v1"
    LLM_MODEL: str = "nemotron-3-nano:30b-cloud"
    LLM_TIMEOUT_SECONDS: float = 60.0
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    SERVICE_API_KEY: str = Field(min_length=32)

    # Rol de solo lectura `siada_ia_ro` (ver backend/scripts/crear-rol-ia-lectura.sql).
    DATABASE_URL: SecretStr
    SQL_MAX_FILAS: int = Field(default=50, ge=1)
    SQL_TIMEOUT_SEGUNDOS: int = Field(default=5, ge=1)
    SQL_MAX_ITERACIONES: int = Field(default=5, ge=1)


settings: Settings = Settings()  # type: ignore[call-arg]  # las claves vienen del entorno
