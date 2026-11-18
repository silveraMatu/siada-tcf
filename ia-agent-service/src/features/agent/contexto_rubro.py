"""Contexto de trabajo por rubro del organismo.

Los códigos son los del enum `Rubro` del backend (backend/src/modules/organismos/domain/enums/rubro.enum.js);
si el backend suma o quita uno hay que reflejarlo aquí. Cada rubro tiene un archivo en `contextos/` con su
trato y vocabulario, sus puntos de riesgo y cómo leer los hallazgos. El contenido es propio del repositorio:
el valor que llega en la petición solo se usa para ELEGIR un archivo, nunca se copia al prompt.
"""

from dataclasses import dataclass
from pathlib import Path

RUBRO_POR_DEFECTO = "OTROS"
_CARPETA = Path(__file__).parent / "contextos"


@dataclass(frozen=True)
class ContextoRubro:
    codigo: str
    etiqueta: str
    texto: str


# código del backend -> (etiqueta legible, archivo)
_CATALOGO: dict[str, tuple[str, str]] = {
    "COMUNICACION_SOCIAL": ("Comunicación Social", "comunicacion_social.md"),
    "COMUNIDAD": ("Comunidad", "comunidad.md"),
    "CULTURA_EDUCACION": ("Cultura y Educación", "cultura_educacion.md"),
    "DESARROLLO_HUMANO": ("Desarrollo Humano", "desarrollo_humano.md"),
    "ECONOMIA_HACIENDA_FINANZAS": (
        "Economía, Hacienda y Finanzas",
        "economia_hacienda_finanzas.md",
    ),
    "GOBIERNO_JUSTICIA_SEGURIDAD_TRABAJO": (
        "Gobierno, Justicia, Seguridad y Trabajo",
        "gobierno_justicia_seguridad_trabajo.md",
    ),
    "PLANIFICACION_OBRAS_SERVICIOS": (
        "Planificación, Inversión, Obras y Servicios Públicos",
        "planificacion_obras_servicios.md",
    ),
    "PRODUCCION_AMBIENTE": ("Producción y Ambiente", "produccion_ambiente.md"),
    "TURISMO": ("Turismo", "turismo.md"),
    RUBRO_POR_DEFECTO: ("Otros", "otros.md"),
}


def _cargar() -> dict[str, ContextoRubro]:
    # Si falta un archivo el servicio no arranca: mejor un error claro que un agente sin contexto.
    contextos: dict[str, ContextoRubro] = {}
    for codigo, (etiqueta, archivo) in _CATALOGO.items():
        ruta = _CARPETA / archivo
        texto = ruta.read_text(encoding="utf-8").strip()
        if not texto:
            raise RuntimeError(f"El contexto del rubro {codigo} está vacío: {ruta}")
        contextos[codigo] = ContextoRubro(codigo, etiqueta, texto)
    return contextos


CONTEXTOS: dict[str, ContextoRubro] = _cargar()
CODIGOS_RUBRO: frozenset[str] = frozenset(CONTEXTOS)


def contexto_para(rubro: object) -> ContextoRubro:
    """El contexto del rubro; si el valor no es un código conocido (o falta) usa el genérico."""
    if isinstance(rubro, str) and rubro in CONTEXTOS:
        return CONTEXTOS[rubro]
    return CONTEXTOS[RUBRO_POR_DEFECTO]
