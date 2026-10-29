import logging

from features.agent.agent import chat_auditor_graph
from features.agent.models import ConsultaAuditorInput, ConsultaAuditorOutput

logger: logging.Logger = logging.getLogger(__name__)


class AgenteNoDisponibleError(Exception):
    """El grafo o el LLM fallaron al resolver la consulta."""


class ChatAuditorService:
    async def consultar(self, input_data: ConsultaAuditorInput) -> ConsultaAuditorOutput:
        try:
            resultado = await chat_auditor_graph.ainvoke({"input_data": input_data})
        except Exception as exc:
            # Sin pregunta ni contexto en el log: son datos de rendiciones.
            logger.exception("Falló la consulta al agente (%s)", type(exc).__name__)
            raise AgenteNoDisponibleError from exc
        return ConsultaAuditorOutput(respuesta=resultado["respuesta_llm"])
