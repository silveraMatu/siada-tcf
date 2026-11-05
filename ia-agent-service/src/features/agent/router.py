from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from core.security import verificar_api_key
from features.agent.models import ConsultaAuditorInput, ConsultaAuditorOutput
from features.agent.service import AgenteNoDisponibleError, ChatAuditorService
from features.agent.streaming import KEEPALIVE_SSE, con_keepalive, formatear_sse

MENSAJE_NO_DISPONIBLE: str = "El asistente no está disponible en este momento. Intente nuevamente."

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
            status_code=status.HTTP_502_BAD_GATEWAY, detail=MENSAJE_NO_DISPONIBLE
        ) from exc


async def _flujo_sse(service: ChatAuditorService, input_data: ConsultaAuditorInput) -> AsyncIterator[str]:
    """Pasos y respuesta como Server-Sent Events. Una vez enviada la cabecera ya no hay código HTTP que
    cambiar: un fallo sale como evento `error`. Si el cliente se va, se cierra y se cancela el agente."""
    try:
        async for evento in con_keepalive(service.consultar_en_vivo(input_data)):
            if evento is None:
                yield KEEPALIVE_SSE  # evita que un proxy corte la conexión mientras el modelo piensa
            else:
                yield formatear_sse(evento["evento"], evento["datos"])
        yield formatear_sse("fin", {})
    except AgenteNoDisponibleError:
        yield formatear_sse("error", {"mensaje": MENSAJE_NO_DISPONIBLE})


@router.post("/chat/stream")
async def consultar_en_vivo(
    input_data: ConsultaAuditorInput,
    service: Annotated[ChatAuditorService, Depends(get_chat_service)],
) -> StreamingResponse:
    return StreamingResponse(
        _flujo_sse(service, input_data),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
