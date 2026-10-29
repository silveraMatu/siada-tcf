from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import verificar_api_key
from features.agent.models import ConsultaAuditorInput, ConsultaAuditorOutput
from features.agent.service import AgenteNoDisponibleError, ChatAuditorService

router = APIRouter(
    prefix="/api/v1/agent",
    tags=["Chat Auditor"],
    dependencies=[Depends(verificar_api_key)],
)


def get_chat_service() -> ChatAuditorService:
    return ChatAuditorService()


@router.post("/chat", response_model=ConsultaAuditorOutput)
async def consultar(
    input_data: ConsultaAuditorInput,
    service: Annotated[ChatAuditorService, Depends(get_chat_service)],
) -> ConsultaAuditorOutput:
    try:
        return await service.consultar(input_data)
    except AgenteNoDisponibleError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El asistente no está disponible en este momento. Intente nuevamente.",
        ) from exc
