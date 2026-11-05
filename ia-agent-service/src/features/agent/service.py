import logging
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig

from core.config import settings
from features.agent.agent import chat_auditor_graph
from features.agent.models import ConsultaAuditorInput, ConsultaAuditorOutput, PasoTraza
from features.agent.traza import filtrar_respuesta, paso_en_curso

logger: logging.Logger = logging.getLogger(__name__)

# Un evento del agente: {"evento": "pensando" | "paso" | "respuesta", "datos": {...}}.
Evento = dict[str, Any]


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

    @staticmethod
    def _pasos_de(nodo: str, salida: dict[str, Any]) -> list[dict[str, Any]]:
        """Los pasos que anuncia (en curso) o termina (resultado) la salida de un nodo del grafo."""
        if nodo == "call_model" and "respuesta_llm" not in salida:
            # El modelo decidió consultar: se anuncia antes de ejecutar nada.
            for mensaje in reversed(salida.get("messages", [])):
                if isinstance(mensaje, AIMessage):
                    return [
                        paso_en_curso(str(llamada["id"]), llamada["args"])
                        for llamada in mensaje.tool_calls
                        if llamada.get("id")
                    ]
        if nodo == "tools":
            return list(salida.get("pasos", []))
        return []

    async def consultar_en_vivo(self, input_data: ConsultaAuditorInput) -> AsyncIterator[Evento]:
        """Los eventos de la consulta a medida que ocurren: cada paso («en curso» y su resultado) y la respuesta.

        Lanza AgenteNoDisponibleError si el grafo o el LLM fallan. Si el consumidor cierra el generador
        (el cliente se desconectó) se cancela el grafo y con él la llamada al modelo.
        """
        respuesta: str | None = None
        # Texto fijo: el modelo puede tardar decenas de segundos antes de su primer paso y la pantalla no
        # debería quedar en blanco.
        yield {"evento": "pensando", "datos": {"mensaje": "Analizando tu pregunta"}}
        try:
            async for actualizacion in chat_auditor_graph.astream(
                {"input_data": input_data},
                config=self._config(input_data),
                stream_mode="updates",
            ):
                for nodo, salida in actualizacion.items():
                    if not isinstance(salida, dict):
                        continue
                    for paso in self._pasos_de(nodo, salida):
                        # La traza es parte del contrato: si un paso no es válido falla el pedido.
                        yield {
                            "evento": "paso",
                            "datos": PasoTraza.model_validate(paso).model_dump(),
                        }
                    if nodo == "tools":
                        yield {"evento": "pensando", "datos": {"mensaje": "Analizando los resultados"}}
                    if "respuesta_llm" in salida:
                        respuesta = salida["respuesta_llm"]
            if respuesta is None:
                raise ValueError("El agente terminó sin producir una respuesta")
            texto = filtrar_respuesta(respuesta)
        except Exception as exc:
            # Sin pregunta ni contexto en el log: son datos de rendiciones.
            logger.exception("Falló la consulta al agente (%s)", type(exc).__name__)
            raise AgenteNoDisponibleError from exc
        yield {"evento": "respuesta", "datos": {"respuesta": texto}}

    async def consultar(self, input_data: ConsultaAuditorInput) -> ConsultaAuditorOutput:
        """Lo mismo que `consultar_en_vivo`, pero junta todo y devuelve el resultado completo."""
        pasos: dict[str, dict[str, Any]] = {}  # por id: el último estado de cada paso
        respuesta = ""
        async for evento in self.consultar_en_vivo(input_data):
            if evento["evento"] == "paso":
                pasos[evento["datos"]["id"]] = evento["datos"]
            elif evento["evento"] == "respuesta":
                respuesta = evento["datos"]["respuesta"]
        return ConsultaAuditorOutput(
            respuesta=respuesta,
            pasos=[PasoTraza.model_validate(p) for p in pasos.values()],
        )
