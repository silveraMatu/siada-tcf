import asyncio
import contextlib
import json
from collections.abc import AsyncIterator
from typing import Any

INTERVALO_KEEPALIVE_SEGUNDOS: float = 15.0
KEEPALIVE_SSE: str = ": keepalive\n\n"


def formatear_sse(evento: str, datos: dict[str, Any]) -> str:
    return f"event: {evento}\ndata: {json.dumps(datos, ensure_ascii=False)}\n\n"


async def con_keepalive[T](
    eventos: AsyncIterator[T], intervalo: float = INTERVALO_KEEPALIVE_SEGUNDOS
) -> AsyncIterator[T | None]:
    """Reenvía los eventos y emite `None` cada `intervalo` segundos sin novedades (para un comentario SSE).

    No usa `wait_for` sobre el siguiente evento: cancelarlo por timeout cancelaría el trabajo del agente.
    Si el consumidor cierra este generador (el cliente se desconectó) se cancela también el origen.
    """
    siguiente: asyncio.Future[T] | None = None
    try:
        while True:
            if siguiente is None:
                siguiente = asyncio.ensure_future(anext(eventos))
            hechas, _ = await asyncio.wait({siguiente}, timeout=intervalo)
            if not hechas:
                yield None
                continue
            tarea, siguiente = siguiente, None
            try:
                evento = tarea.result()
            except StopAsyncIteration:
                return
            yield evento
    finally:
        if siguiente is not None:
            siguiente.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await siguiente
        aclose = getattr(eventos, "aclose", None)
        if aclose is not None:
            with contextlib.suppress(Exception):
                await aclose()
