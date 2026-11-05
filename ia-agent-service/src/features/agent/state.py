import operator
from typing import Annotated, Any, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

from features.agent.models import ConsultaAuditorInput


class AgentState(TypedDict):
    input_data: ConsultaAuditorInput
    messages: Annotated[list[AnyMessage], add_messages]
    respuesta_llm: str
    iteraciones: int
    # Traza de la ejecución: cada nodo devuelve solo los pasos nuevos y el reductor los acumula.
    pasos: Annotated[list[dict[str, Any]], operator.add]


class AgentInput(TypedDict):
    input_data: ConsultaAuditorInput


class AgentOutput(TypedDict):
    respuesta_llm: str
    # Ausente si el modelo no consultó nada.
    pasos: list[dict[str, Any]]
