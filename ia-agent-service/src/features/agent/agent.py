from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from core.llm import get_llm
from features.agent.prompts import construir_prompt_sistema
from features.agent.state import AgentInput, AgentOutput, AgentState


async def generar_respuesta(state: AgentState) -> dict[str, Any]:
    input_data = state["input_data"]
    mensajes = [
        SystemMessage(content=construir_prompt_sistema(input_data)),
        HumanMessage(content=input_data.pregunta),
    ]
    respuesta = await get_llm().ainvoke(mensajes)
    texto = respuesta.text
    if not texto.strip():
        raise ValueError("El LLM devolvió una respuesta vacía")
    return {"messages": [*mensajes, respuesta], "respuesta_llm": texto}


_builder: StateGraph[AgentState, None, AgentInput, AgentOutput] = StateGraph(
    AgentState, input_schema=AgentInput, output_schema=AgentOutput
)
_builder.add_node("generar_respuesta", generar_respuesta)
_builder.add_edge(START, "generar_respuesta")
_builder.add_edge("generar_respuesta", END)

chat_auditor_graph = _builder.compile()
