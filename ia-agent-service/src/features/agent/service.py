import logging

from langchain_core.runnables import RunnableConfig

from core.config import settings
from features.agent.agent import chat_auditor_graph
from features.agent.models import ConsultaAuditorInput, ConsultaAuditorOutput

logger: logging.Logger = logging.getLogger(__name__)


class AgenteNoDisponibleError(Exception):
    """El grafo o el LLM fallaron al resolver la consulta."""


class ChatAuditorService:
    @staticmethod
    def _config(input_data: ConsultaAuditorInput) -> RunnableConfig:
        # El organismo viaja por la config del grafo: la herramienta SQL lo lee de acá y el LLM
        # no lo ve ni lo puede cambiar. Cada ronda de consultas son 2 pasos (modelo + herramienta).
        return {
            "configurable": {"organismo_id": input_data.organismo_id},
            "recursion_limit": 2 * settings.SQL_MAX_ITERACIONES + 5,
        }

    async def consultar(self, input_data: ConsultaAuditorInput) -> ConsultaAuditorOutput:
        try:
            resultado = await chat_auditor_graph.ainvoke(
                {"input_data": input_data}, config=self._config(input_data)
            )
        except Exception as exc:
            # Sin pregunta ni contexto en el log: son datos de rendiciones.
            logger.exception("Falló la consulta al agente (%s)", type(exc).__name__)
            raise AgenteNoDisponibleError from exc
        return ConsultaAuditorOutput(respuesta=resultado["respuesta_llm"])
