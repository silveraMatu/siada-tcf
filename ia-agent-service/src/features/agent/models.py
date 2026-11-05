import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_CARACTERES_CONTEXTO: int = 20_000

# Hoy la única acción que registra la traza; `accion` es texto para sumar gráficos o tratamiento de datos.
ACCION_CONSULTA_SQL: str = "consulta_sql"


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
    """Una acción del modelo contra la base, para que el auditor pueda auditar a la IA."""

    accion: str = ACCION_CONSULTA_SQL
    # El SQL ejecutado (regenerado por sqlglot); si las guardas lo rechazaron, el texto del modelo.
    query_sql: str
    cantidad_filas: int | None = None
    # Tiempo contra la base; None si no hubo consulta (la validación la rechazó antes).
    duracion_ms: int | None = None
    error: str | None = None
    # True si había más filas que las que vio el modelo (tope SQL_MAX_FILAS).
    truncado: bool = False
    columnas: list[str] = Field(default_factory=list)
    # Las mismas filas que se le mandaron al modelo; importes y fechas como texto, sin perder precisión.
    filas: list[list[Any]] = Field(default_factory=list)


class ConsultaAuditorOutput(BaseModel):
    respuesta: str
    pasos: list[PasoTraza] = Field(default_factory=list)
