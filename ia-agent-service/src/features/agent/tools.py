import json
import logging
import time
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from core.config import settings
from core.database import get_db_session
from features.agent.models import ACCION_CONSULTA_SQL
from features.agent.sql_guard import validar_consulta

logger: logging.Logger = logging.getLogger(__name__)

MAX_CARACTERES_RESULTADO: int = 20_000


def _mensaje_db(exc: DBAPIError) -> str:
    detalle = " ".join(str(exc.orig if exc.orig is not None else exc).split())
    # Sin el SQL ni los parámetros que agrega SQLAlchemy: solo lo que dijo Postgres.
    detalle = detalle.split(">: ", 1)[-1]
    if "statement timeout" in detalle:
        return f"La consulta superó el tiempo máximo de {settings.SQL_TIMEOUT_SEGUNDOS}s: simplificala"
    return detalle[:300]


def _armar_resultado(
    columnas: list[str], filas: list[list[Any]], truncado: bool
) -> tuple[str, dict[str, Any]]:
    """Lo que ve el modelo: el JSON y esos mismos datos ya reparseados (para la traza).

    `default=str` deja Decimal, date y datetime como texto sin perder precisión, y el reparseo
    garantiza que la traza muestre exactamente lo que recibió el modelo, filas recortadas incluidas.
    """
    while True:
        contenido = json.dumps(
            {"columnas": columnas, "filas": filas, "truncado": truncado},
            default=str,
            ensure_ascii=False,
        )
        if len(contenido) <= MAX_CARACTERES_RESULTADO or not filas:
            return contenido, json.loads(contenido)
        filas, truncado = filas[: len(filas) // 2], True


def _ms(inicio: float | None) -> int | None:
    return None if inicio is None else round((time.perf_counter() - inicio) * 1000)


def _paso(
    query_sql: str,
    *,
    duracion_ms: int | None,
    error: str | None = None,
    datos: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Artefacto con la traza del intento: no viaja al modelo, lo recoge el nodo `ejecutar_tools`."""
    datos = datos or {}
    filas: list[list[Any]] = datos.get("filas", [])
    return {
        "accion": ACCION_CONSULTA_SQL,
        "query_sql": query_sql,
        "cantidad_filas": len(filas),  # 0 si hubo error
        "duracion_ms": duracion_ms,
        "error": error,
        "truncado": bool(datos.get("truncado", False)),
        "columnas": datos.get("columnas", []),
        "filas": filas,
    }


@tool(response_format="content_and_artifact")
async def ejecutar_consulta_sql(
    query: str, config: RunnableConfig
) -> tuple[str, dict[str, Any]]:
    """Ejecuta una consulta SELECT de PostgreSQL sobre las rendiciones del organismo del auditor.

    Usala para obtener cifras y datos exactos (saldos, depósitos, retiros, estados, observaciones).
    Solo se permite una sentencia SELECT sobre las tablas del esquema; no admite WITH ni comentarios.
    Devuelve JSON con `columnas`, `filas` y `truncado` (true si hubo más filas de las devueltas),
    o un texto que empieza con "ERROR:" si la consulta falló: en ese caso corregila y reintentá.

    Args:
        query: la consulta SELECT en SQL compatible con PostgreSQL.
    """
    organismo_id = (config.get("configurable") or {}).get("organismo_id")
    if not isinstance(organismo_id, int):
        # No debería ocurrir: el grafo no vincula la herramienta sin organismo.
        raise RuntimeError("La herramienta SQL se invocó sin organismo_id")

    sql = query.strip()  # si las guardas lo rechazan, la traza muestra lo que escribió el modelo
    inicio_db: float | None = None  # solo corre si hubo consulta contra la base
    try:
        sql = validar_consulta(query)
        inicio_db = time.perf_counter()
        async with get_db_session(organismo_id) as session:
            # Los ":" se escapan para que un literal como '12:30' no se lea como parámetro.
            resultado = await session.execute(text(sql.replace(":", "\\:")))
            columnas = list(resultado.keys())
            filas = [list(fila) for fila in resultado.fetchall()]
    except ValueError as exc:
        logger.info("SQL rechazado organismo=%s motivo=%s", organismo_id, exc)
        return f"ERROR: {exc}", _paso(sql, duracion_ms=_ms(inicio_db), error=str(exc))
    except DBAPIError as exc:
        if exc.connection_invalidated:
            raise
        mensaje = _mensaje_db(exc)
        logger.info("SQL fallido organismo=%s motivo=%s sql=%s", organismo_id, mensaje, sql)
        return f"ERROR: {mensaje}", _paso(sql, duracion_ms=_ms(inicio_db), error=mensaje)

    duracion_ms = _ms(inicio_db)
    truncado = len(filas) > settings.SQL_MAX_FILAS
    contenido, datos = _armar_resultado(columnas, filas[: settings.SQL_MAX_FILAS], truncado)
    # Sin datos en el log: solo el SQL, la cantidad de filas y el tiempo.
    logger.info(
        "SQL ejecutado organismo=%s filas=%s ms=%s sql=%s",
        organismo_id,
        len(datos["filas"]),
        duracion_ms,
        sql,
    )
    return contenido, _paso(sql, duracion_ms=duracion_ms, datos=datos)


auditor_tools: list[BaseTool] = [ejecutar_consulta_sql]
