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


def _armar_resultado(columnas: list[str], filas: list[list[Any]], truncado: bool) -> str:
    # default=str: Decimal, date y datetime salen como texto sin perder precisión.
    while True:
        contenido = json.dumps(
            {"columnas": columnas, "filas": filas, "truncado": truncado},
            default=str,
            ensure_ascii=False,
        )
        if len(contenido) <= MAX_CARACTERES_RESULTADO or not filas:
            return contenido
        filas, truncado = filas[: len(filas) // 2], True


@tool
async def ejecutar_consulta_sql(query: str, config: RunnableConfig) -> str:
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

    inicio = time.perf_counter()
    try:
        sql = validar_consulta(query)
        async with get_db_session(organismo_id) as session:
            # Los ":" se escapan para que un literal como '12:30' no se lea como parámetro.
            resultado = await session.execute(text(sql.replace(":", "\\:")))
            columnas = list(resultado.keys())
            filas = [list(fila) for fila in resultado.fetchall()]
    except ValueError as exc:
        logger.info("SQL rechazado organismo=%s motivo=%s", organismo_id, exc)
        return f"ERROR: {exc}"
    except DBAPIError as exc:
        if exc.connection_invalidated:
            raise
        mensaje = _mensaje_db(exc)
        logger.info("SQL fallido organismo=%s motivo=%s sql=%s", organismo_id, mensaje, sql)
        return f"ERROR: {mensaje}"

    truncado = len(filas) > settings.SQL_MAX_FILAS
    filas = filas[: settings.SQL_MAX_FILAS]
    # Sin datos en el log: solo el SQL, la cantidad de filas y el tiempo.
    logger.info(
        "SQL ejecutado organismo=%s filas=%s ms=%s sql=%s",
        organismo_id,
        len(filas),
        round((time.perf_counter() - inicio) * 1000),
        sql,
    )
    return _armar_resultado(columnas, filas, truncado)


auditor_tools: list[BaseTool] = [ejecutar_consulta_sql]
