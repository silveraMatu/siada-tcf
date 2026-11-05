"""Lo que el auditor ve del trabajo del agente: pasos en lenguaje natural, nunca SQL ni nombres de la base.

Todo acá es puro (sin LLM ni base): el motivo que escribe el modelo se sanea, las fuentes y los resultados
los calcula el servidor a partir del SQL ya validado (el modelo no puede falsearlos) y la respuesta final
pasa por un filtro que reemplaza los nombres técnicos que se le hayan escapado.
"""

import logging
import re
from typing import Any

import sqlglot
from sqlglot import exp
from sqlglot.errors import SqlglotError

from features.agent.models import ACCION_CONSULTA_DATOS, EstadoPaso
from features.agent.schema import (
    AREA_POR_TABLA,
    NOMBRE_AMIGABLE_POR_TABLA,
    SCHEMA_PERMITIDO,
    TABLAS_PERMITIDAS,
)

logger: logging.Logger = logging.getLogger(__name__)

MAX_LARGO_MOTIVO: int = 160
MENSAJE_PASO_FALLIDO: str = "No pude completar este paso"

# Un motivo con cualquiera de estas cosas no se muestra: se reemplaza por un texto automático.
_SIMBOLOS_TECNICOS = re.compile(r"[`;=<>{}\[\]|\\$]|--|/\*|\*/|::")
_PALABRAS_SQL = re.compile(
    r"\b(select|from|join|where|group\s+by|order\s+by|having|insert|update|delete|drop|alter|truncate|union|limit|offset)\b",
    re.IGNORECASE,
)
_FUNCIONES_SQL = re.compile(
    r"\b(sum|count|avg|min|max|coalesce|cast|round|date_trunc|to_char)\s*\(", re.IGNORECASE
)
# Identificadores con guion bajo (cuenta_mensual_id, libros_banco...): son nombres de la base.
_IDENTIFICADOR = re.compile(r"\b[A-Za-z]+_[A-Za-z0-9_]+\b")
_EXTERNO = re.compile(r"https?://|www\.|@", re.IGNORECASE)

# Nombres de columnas del esquema, para limpiar la respuesta final.
_COLUMNAS: frozenset[str] = frozenset(re.findall(r"^  (\w+) ", SCHEMA_PERMITIDO, re.MULTILINE))

_TABLAS_POR_LARGO = sorted(NOMBRE_AMIGABLE_POR_TABLA, key=len, reverse=True)
_PATRON_TABLA = re.compile(
    r"(?P<prep>\b(?:de|del|en|desde|a)\s+)?(?:(?:la|las|el|los)\s+)?(?P<tabla>tabla\s+)?"
    r"(?P<bt>`)?\b(?P<nombre>" + "|".join(_TABLAS_POR_LARGO) + r")\b`?",
    re.IGNORECASE,
)
_PATRON_COLUMNA = re.compile(
    r"(?:(?:la|las)\s+)?columnas?\s+`?(?P<col>[A-Za-z0-9_]+)`?", re.IGNORECASE
)
# Tablas que el rol no puede leer: si el modelo las nombra para explicar un rechazo, se dice «esa información».
_PATRON_TABLA_VEDADA = re.compile(
    r"(?:(?:la|las)\s+)?\btablas?\s+`?(?:usuarios|responsables|registro_actividad)`?", re.IGNORECASE
)
# Letras y guiones bajos internos (cuenta_mensual_id) o con guion inicial y otro más (_por_id); un _énfasis_ de
# markdown no entra: tiene un solo guion bajo de cada lado.
_PATRON_SNAKE_CASE = re.compile(
    r"\b[A-Za-z]+(?:_[A-Za-z0-9]+)+\b|(?<![A-Za-z0-9])_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+\b"
)
_PATRON_COMILLAS_EN_LINEA = re.compile(r"`([^`\n]+)`")
_BLOQUE_DE_CODIGO = re.compile(r"```[A-Za-z]*\n?(?P<codigo>.*?)```", re.DOTALL)
_SQL_EN_LINEA = re.compile(r"\bselect\b[^\n]{0,300}?\bfrom\b[^\n]{0,300}", re.IGNORECASE)


def tablas_consultadas(query: str) -> list[str]:
    """Tablas conocidas que menciona un SQL, en orden y sin repetir. No valida nada (eso lo hace el guard)."""
    try:
        arbol = sqlglot.parse_one(query, dialect="postgres")
    except SqlglotError:
        return []
    vistas: list[str] = []
    for tabla in arbol.find_all(exp.Table):
        nombre = tabla.name.lower()
        if nombre in TABLAS_PERMITIDAS and nombre not in vistas:
            vistas.append(nombre)
    return vistas


def fuentes_de(query: str) -> list[str]:
    """Las áreas de las que salen los datos, en palabras de negocio y sin repetir."""
    areas: list[str] = []
    for tabla in tablas_consultadas(query):
        area = AREA_POR_TABLA[tabla]
        if area not in areas:
            areas.append(area)
    return areas


def _unir(elementos: list[str]) -> str:
    if len(elementos) <= 1:
        return "".join(elementos)
    return ", ".join(elementos[:-1]) + " y " + elementos[-1]


def _texto_automatico(fuentes: list[str]) -> str:
    return f"Consultando {_unir(fuentes)}" if fuentes else "Consultando los datos del organismo"


def sanear_motivo(motivo: object, fuentes: list[str]) -> str:
    """El motivo del modelo si es lenguaje natural limpio; si no, un texto armado con las fuentes."""
    automatico = _texto_automatico(fuentes)
    if not isinstance(motivo, str):
        return automatico
    texto = " ".join(motivo.split())  # una sola línea
    if not texto:
        return automatico
    if (
        _SIMBOLOS_TECNICOS.search(texto)
        or _PALABRAS_SQL.search(texto)
        or _FUNCIONES_SQL.search(texto)
        or _IDENTIFICADOR.search(texto)
        or _EXTERNO.search(texto)
    ):
        return automatico
    if len(texto) > MAX_LARGO_MOTIVO:
        texto = texto[:MAX_LARGO_MOTIVO].rsplit(" ", 1)[0].rstrip(",;:. ") + "…"
    return texto[0].upper() + texto[1:]


def describir_llamada(argumentos: dict[str, Any]) -> tuple[str, list[str]]:
    """(descripción, fuentes) de una llamada a la herramienta, a partir de lo que pidió el modelo."""
    query = argumentos.get("query")
    fuentes = fuentes_de(query) if isinstance(query, str) else []
    return sanear_motivo(argumentos.get("motivo"), fuentes), fuentes


def resultado_en_palabras(estado: EstadoPaso, cantidad: int | None, parcial: bool) -> str | None:
    if estado == "en_curso":
        return None
    if estado == "error":
        return MENSAJE_PASO_FALLIDO
    total = cantidad or 0
    if estado == "sin_resultados" or total == 0:
        return "No encontré registros"
    if parcial:
        return f"Encontré más de {total} registros; analicé los primeros {total}"
    return "Encontré 1 registro" if total == 1 else f"Encontré {total} registros"


def _paso(
    id: str,
    argumentos: dict[str, Any],
    estado: EstadoPaso,
    cantidad: int | None = None,
    duracion_ms: int | None = None,
    parcial: bool = False,
) -> dict[str, Any]:
    descripcion, fuentes = describir_llamada(argumentos)
    return {
        "id": id,
        "accion": ACCION_CONSULTA_DATOS,
        "descripcion": descripcion,
        "fuentes": fuentes,
        "estado": estado,
        "resultado": resultado_en_palabras(estado, cantidad, parcial),
        "cantidad_registros": cantidad,
        "duracion_ms": duracion_ms,
        "parcial": parcial,
    }


def paso_en_curso(id: str, argumentos: dict[str, Any]) -> dict[str, Any]:
    """El paso apenas el modelo decide consultar, antes de ejecutar nada."""
    return _paso(id, argumentos, "en_curso")


def paso_fallido(id: str, argumentos: dict[str, Any]) -> dict[str, Any]:
    """Un paso que no dejó resultado (la herramienta explotó o la llamada era inválida): sin ningún detalle."""
    return _paso(id, argumentos, "error")


def paso_publico(id: str, argumentos: dict[str, Any], artefacto: dict[str, Any]) -> dict[str, Any]:
    """El paso terminado, a partir del artefacto interno que dejó la herramienta (sin SQL ni datos)."""
    return _paso(
        id,
        argumentos,
        artefacto["estado"],
        artefacto.get("cantidad_registros"),
        artefacto.get("duracion_ms"),
        bool(artefacto.get("parcial", False)),
    )


def _con_articulo(preposicion: str, amigable: str) -> str:
    base = preposicion.strip().lower()
    if base == "de" and amigable.startswith("el "):
        return "del " + amigable[3:]
    if base == "a" and amigable.startswith("el "):
        return "al " + amigable[3:]
    return (preposicion + amigable) if preposicion else amigable


def filtrar_respuesta(texto: str) -> str:
    """Red de seguridad: reemplaza nombres técnicos que el modelo haya dejado en su respuesta final.

    El prompt ya le pide fuentes en palabras de negocio; esto no depende de que obedezca. Solo registra
    cuántos reemplazos hizo, nunca el contenido.
    """
    cambios = 0

    def quitar_codigo(m: re.Match[str]) -> str:
        nonlocal cambios
        codigo = m.group("codigo")
        if re.search(r"\bselect\b", codigo, re.IGNORECASE) and re.search(
            r"\bfrom\b", codigo, re.IGNORECASE
        ):
            cambios += 1
            return ""
        return m.group(0)

    texto = _BLOQUE_DE_CODIGO.sub(quitar_codigo, texto)

    texto, n = _SQL_EN_LINEA.subn("[consulta omitida]", texto)
    cambios += n

    def reemplazar_tabla(m: re.Match[str]) -> str:
        nonlocal cambios
        nombre = m.group("nombre").lower()
        # «organismos» y «observaciones» también son palabras comunes: solo se tocan si se las presenta
        # como tabla o entre comillas, o si es un nombre con guion bajo (que no existe en el lenguaje natural).
        if "_" not in nombre and not m.group("tabla") and not m.group("bt"):
            return m.group(0)
        cambios += 1
        return _con_articulo(m.group("prep") or "", NOMBRE_AMIGABLE_POR_TABLA[nombre])

    texto = _PATRON_TABLA.sub(reemplazar_tabla, texto)

    def reemplazar_columna(m: re.Match[str]) -> str:
        nonlocal cambios
        col = m.group("col")
        if col.lower() not in _COLUMNAS:
            return m.group(0)
        cambios += 1
        return col.replace("_", " ")

    texto = _PATRON_COLUMNA.sub(reemplazar_columna, texto)

    texto, n = _PATRON_TABLA_VEDADA.subn("esa información", texto)
    cambios += n

    # Cualquier identificador con guion bajo que quede (columnas, claves foráneas...) se lee como texto común.
    texto, n = _PATRON_SNAKE_CASE.subn(lambda m: m.group(0).replace("_", " "), texto)
    cambios += n

    # El código en línea no le sirve al auditor: se deja el texto sin las comillas invertidas.
    texto = _PATRON_COMILLAS_EN_LINEA.sub(r"\1", texto)

    if cambios:
        logger.warning("La respuesta del modelo nombraba elementos técnicos (%s reemplazos)", cambios)
    return texto
