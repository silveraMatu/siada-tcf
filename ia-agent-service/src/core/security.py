import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from core.config import settings

api_key_header: APIKeyHeader = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verificar_api_key(api_key: str | None = Security(api_key_header)) -> None:
    """Exige que el llamador (el backend de SIADA) envíe la API key del servicio."""
    valida = api_key is not None and secrets.compare_digest(
        api_key.encode(), settings.SERVICE_API_KEY.encode()
    )
    if not valida:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida"
        )
