from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

from features.agent.models import ConsultaAuditorInput


class AgentState(TypedDict):
    input_data: ConsultaAuditorInput
    messages: Annotated[list[AnyMessage], add_messages]
    respuesta_llm: str
    iteraciones: int


class AgentInput(TypedDict):
    input_data: ConsultaAuditorInput


class AgentOutput(TypedDict):
    respuesta_llm: str
