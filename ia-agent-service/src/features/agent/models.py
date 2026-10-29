import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_CARACTERES_CONTEXTO: int = 20_000


class ConsultaAuditorInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pregunta: str = Field(min_length=1, max_length=4000)
    contexto_rendicion: dict[str, Any] | None = None
    metadatos_organismo: dict[str, Any] | None = None

    @field_validator("contexto_rendicion", "metadatos_organismo")
    @classmethod
    def _limitar_tamano(cls, valor: dict[str, Any] | None) -> dict[str, Any] | None:
        if valor is not None and len(json.dumps(valor, default=str)) > MAX_CARACTERES_CONTEXTO:
            raise ValueError(
                f"No puede superar los {MAX_CARACTERES_CONTEXTO} caracteres serializado"
            )
        return valor


class ConsultaAuditorOutput(BaseModel):
    respuesta: str
