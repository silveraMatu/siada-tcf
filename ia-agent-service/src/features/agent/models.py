import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_CARACTERES_CONTEXTO: int = 20_000

# Hoy la única acción que registra la traza; `accion` es texto para sumar gráficos o tratamiento de datos.
ACCION_CONSULTA_DATOS: str = "consulta_datos"

EstadoPaso = Literal["en_curso", "completado", "sin_resultados", "error"]


class ConsultaAuditorInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pregunta: str = Field(min_length=1, max_length=4000)
    contexto_rendicion: dict[str, Any] | None = None
    metadatos_organismo: dict[str, Any] | None = None
    # Organismo al que está asignado el auditor; lo envía el backend. Sin él no se consulta nada.
    organismo_id: int | None = Field(default=None, ge=1)

    @field_validator("contexto_rendicion", "metadatos_organismo")
    @classmethod
    def _limitar_tamano(cls, valor: dict[str, Any] | None) -> dict[str, Any] | None:
        if valor is not None and len(json.dumps(valor, default=str)) > MAX_CARACTERES_CONTEXTO:
            raise ValueError(
                f"No puede superar los {MAX_CARACTERES_CONTEXTO} caracteres serializado"
            )
        return valor


class PasoTraza(BaseModel):
    """Una acción del agente explicada en lenguaje natural, sin SQL ni nombres de tablas o columnas."""

    # Id de la llamada a la herramienta: une el evento «en curso» con su resultado.
    id: str
    accion: str = ACCION_CONSULTA_DATOS
    # Lo que busca el agente, en palabras (el motivo del modelo ya saneado o un texto automático).
    descripcion: str
    # De dónde salen los datos, en palabras de negocio: lo calcula el servidor, no el modelo.
    fuentes: list[str] = Field(default_factory=list)
    estado: EstadoPaso
    # Resultado en palabras; None mientras el paso está en curso.
    resultado: str | None = None
    cantidad_registros: int | None = None
    duracion_ms: int | None = None
    # True si había más registros que los que vio el modelo (tope SQL_MAX_FILAS).
    parcial: bool = False


class ConsultaAuditorOutput(BaseModel):
    respuesta: str
    pasos: list[PasoTraza] = Field(default_factory=list)
