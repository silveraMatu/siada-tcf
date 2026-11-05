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


def _armar_resultado(
    columnas: list[str], filas: list[list[Any]], truncado: bool
) -> tuple[str, dict[str, Any]]:
    """Lo que ve el modelo: el JSON y esos mismos datos ya reparseados.

    `default=str` deja Decimal, date y datetime como texto sin perder precisión. Si el tope de
    caracteres recorta filas, el resultado informa `truncado` y la cantidad refleja lo que vio el modelo.
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


def _artefacto(
    estado: str,
    *,
    cantidad_registros: int | None = None,
    duracion_ms: int | None,
    parcial: bool = False,
) -> dict[str, Any]:
    """Lo único que la herramienta le deja a la traza: estado, cantidad y tiempo. Nunca SQL, datos ni errores.

    No viaja al modelo; lo recoge el nodo `ejecutar_tools`, que arma el paso en lenguaje natural.
    """
    return {
        "estado": estado,
        "cantidad_registros": cantidad_registros,
        "duracion_ms": duracion_ms,
        "parcial": parcial,
    }


@tool(response_format="content_and_artifact")
async def ejecutar_consulta_sql(
    motivo: str, query: str, config: RunnableConfig
) -> tuple[str, dict[str, Any]]:
    """Ejecuta una consulta SELECT de PostgreSQL sobre las rendiciones del organismo del auditor.

    Usala para obtener cifras y datos exactos (saldos, depósitos, retiros, estados, observaciones).
    Solo se permite una sentencia SELECT sobre las tablas del esquema; no admite WITH ni comentarios.
    Devuelve JSON con `columnas`, `filas` y `truncado` (true si hubo más filas de las devueltas),
    o un texto que empieza con "ERROR:" si la consulta falló: en ese caso corregila y reintentá.

    Args:
        motivo: frase corta (hasta 150 caracteres), en lenguaje natural y para un auditor contable, que diga qué información buscás y para qué. Sin tablas, columnas, SQL ni símbolos. El auditor la ve como tu razonamiento.
        query: la consulta SELECT en SQL compatible con PostgreSQL.
    """
    # `motivo` no se usa acá: lo toma `ejecutar_tools` de los argumentos de la llamada para armar el paso.
    organismo_id = (config.get("configurable") or {}).get("organismo_id")
    if not isinstance(organismo_id, int):
        # No debería ocurrir: el grafo no vincula la herramienta sin organismo.
        raise RuntimeError("La herramienta SQL se invocó sin organismo_id")

    sql = query.strip()
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
        return f"ERROR: {exc}", _artefacto("error", duracion_ms=_ms(inicio_db))
    except DBAPIError as exc:
        if exc.connection_invalidated:
            raise
        mensaje = _mensaje_db(exc)
        logger.info("SQL fallido organismo=%s motivo=%s sql=%s", organismo_id, mensaje, sql)
        return f"ERROR: {mensaje}", _artefacto("error", duracion_ms=_ms(inicio_db))

    duracion_ms = _ms(inicio_db)
    truncado = len(filas) > settings.SQL_MAX_FILAS
    contenido, datos = _armar_resultado(columnas, filas[: settings.SQL_MAX_FILAS], truncado)
    cantidad = len(datos["filas"])
    # Solo en el log del servidor (operación): el SQL no sale nunca por la API ni a la bitácora.
    logger.info(
        "SQL ejecutado organismo=%s filas=%s ms=%s sql=%s", organismo_id, cantidad, duracion_ms, sql
    )
    return contenido, _artefacto(
        "completado" if cantidad else "sin_resultados",
        cantidad_registros=cantidad,
        duracion_ms=duracion_ms,
        parcial=bool(datos["truncado"]),
    )


auditor_tools: list[BaseTool] = [ejecutar_consulta_sql]
