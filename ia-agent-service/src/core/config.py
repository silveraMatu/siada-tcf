from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    LLM_API_KEY: str
    LLM_BASE_URL: str = "https://ollama.com/v1"
    LLM_MODEL: str = "nemotron-3-nano:30b-cloud"
    ENVIRONMENT: str = "development"


settings: Settings = Settings()  # type: ignore[call-arg]  # LLM_API_KEY viene del entorno
