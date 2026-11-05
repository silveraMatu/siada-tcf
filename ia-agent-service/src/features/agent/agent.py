from typing import Any, Literal

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from core.config import settings
from core.llm import get_llm
from features.agent.prompts import construir_prompt_sistema, construir_prompt_sql
from features.agent.state import AgentInput, AgentOutput, AgentState
from features.agent.tools import auditor_tools

MENSAJE_SIN_ORGANISMO: str = (
    "No se encuentra auditando ningún organismo en este momento, "
    "por lo que no puedo responder tus consultas."
)


def enrutar_entrada(state: AgentState) -> Literal["call_model", "sin_organismo"]:
    return "call_model" if state["input_data"].organismo_id is not None else "sin_organismo"


async def sin_organismo(state: AgentState) -> dict[str, Any]:
    # Respuesta fija, sin LLM: no hay datos a los que el auditor pueda acceder.
    return {
        "messages": [AIMessage(content=MENSAJE_SIN_ORGANISMO)],
        "respuesta_llm": MENSAJE_SIN_ORGANISMO,
    }


async def call_model(state: AgentState) -> dict[str, Any]:
    input_data = state["input_data"]
    iteraciones = state.get("iteraciones", 0)
    existentes = state.get("messages", [])

    # El historial arranca con la pregunta; el SystemMessage no se guarda en el estado
    # (se arma en cada llamada) para que no se duplique en cada vuelta del ciclo.
    nuevos: list[BaseMessage] = [] if existentes else [HumanMessage(content=input_data.pregunta)]
    sistema = SystemMessage(
        content=f"{construir_prompt_sistema(input_data)}\n\n{construir_prompt_sql()}"
    )

    # Al llegar al tope de consultas se fuerza la respuesta final quitando las herramientas.
    con_tools = iteraciones < settings.SQL_MAX_ITERACIONES
    llm = get_llm()
    modelo: Runnable[LanguageModelInput, BaseMessage] = (
        llm.bind_tools(auditor_tools) if con_tools else llm
    )
    respuesta = await modelo.ainvoke([sistema, *existentes, *nuevos])
    if not isinstance(respuesta, AIMessage):
        raise ValueError("El LLM devolvió un mensaje inesperado")

    salida: dict[str, Any] = {
        "messages": [*nuevos, respuesta],
        "iteraciones": iteraciones + 1,
    }
    if respuesta.tool_calls and con_tools:
        return salida  # `should_continue` lo manda a ejecutar las herramientas
    texto = respuesta.text
    if not texto.strip():
        raise ValueError("El LLM devolvió una respuesta vacía")
    return {**salida, "respuesta_llm": texto}


def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    ultimo = state["messages"][-1]
    pidio_tools = isinstance(ultimo, AIMessage) and bool(ultimo.tool_calls)
    # `iteraciones` ya incluye la llamada que acaba de terminar: pasado el tope no se ejecuta nada.
    if pidio_tools and state["iteraciones"] <= settings.SQL_MAX_ITERACIONES:
        return "tools"
    return "__end__"  # el valor de END


_builder: StateGraph[AgentState, None, AgentInput, AgentOutput] = StateGraph(
    AgentState, input_schema=AgentInput, output_schema=AgentOutput
)
_builder.add_node("sin_organismo", sin_organismo)
_builder.add_node("call_model", call_model)
# Por defecto ToolNode relanza los errores de las herramientas; con True se los devuelve al modelo.
_builder.add_node("tools", ToolNode(auditor_tools, handle_tool_errors=True))

_builder.add_conditional_edges(START, enrutar_entrada, ["call_model", "sin_organismo"])
_builder.add_edge("sin_organismo", END)
_builder.add_conditional_edges("call_model", should_continue, ["tools", END])
_builder.add_edge("tools", "call_model")

chat_auditor_graph = _builder.compile()
