from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from src.core.config import settings


def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=SecretStr(settings.LLM_API_KEY),
        model=settings.LLM_MODEL,
        temperature=0.2,
    )
