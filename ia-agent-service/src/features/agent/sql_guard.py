"""Validación del SQL que genera el LLM (primera capa; la barrera real es el rol de la base).

`validar_consulta` no ejecuta nada: acepta o lanza `ValueError` con un mensaje en español que
vuelve al modelo para que corrija. Devuelve el SQL regenerado desde el AST, que es lo único que
se ejecuta (así lo validado y lo ejecutado no pueden diferir).
"""

import sqlglot
from sqlglot import TokenType, exp
from sqlglot.errors import SqlglotError

from core.config import settings
from features.agent.schema import TABLAS_PERMITIDAS

MAX_LONGITUD_CONSULTA: int = 5000

PALABRAS_PROHIBIDAS: frozenset[str] = frozenset(
    {
        "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER",
        "GRANT", "REVOKE", "CREATE", "COPY", "INTO", "MERGE", "CALL", "DO", "SET", "RESET",
        "EXECUTE", "PREPARE", "DEALLOCATE", "DISCARD", "VACUUM", "REINDEX", "COMMENT",
        "LOCK", "LISTEN", "NOTIFY",
    }
)  # fmt: skip

# Tokens cuyo texto es un dato (literal o identificador entre comillas), no una palabra del SQL.
TOKENS_DE_TEXTO: frozenset[TokenType] = frozenset(
    {
        TokenType.STRING,
        TokenType.NATIONAL_STRING,
        TokenType.RAW_STRING,
        TokenType.HEREDOC_STRING,
        TokenType.BYTE_STRING,
        TokenType.HEX_STRING,
        TokenType.BIT_STRING,
        TokenType.UNICODE_STRING,
        TokenType.IDENTIFIER,
    }
)

NODOS_PROHIBIDOS: tuple[type[exp.Expression], ...] = (
    exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Alter, exp.Create, exp.Command,
    exp.Into, exp.Merge, exp.Copy, exp.Set, exp.Lock, exp.Grant, exp.Transaction,
    exp.Commit, exp.Rollback, exp.Use, exp.Pragma, exp.Declare, exp.Execute,
)  # fmt: skip

# sqlglot reconoce como funciones tipadas las de análisis comunes (SUM, ROUND, DATE_TRUNC,
# TO_CHAR...); lo demás sale como `Anonymous` y se rechaza salvo esta lista (bloquea pg_sleep,
# set_config, current_setting, query_to_xml, lo_import, nextval...).
FUNCIONES_ANONIMAS_PERMITIDAS: frozenset[str] = frozenset({"age"})


def _mensaje_sql(error: SqlglotError) -> str:
    return " ".join(str(error).split())[:300]


def validar_consulta(query: str, max_filas: int | None = None) -> str:
    max_filas = settings.SQL_MAX_FILAS if max_filas is None else max_filas
    texto = query.strip()

    # a) Debe empezar con SELECT.
    if not texto.upper().startswith("SELECT"):
        if texto.upper().startswith("WITH"):
            raise ValueError(
                "Solo se permiten consultas SELECT: no se admite WITH, reescribila con subconsultas"
            )
        raise ValueError("Solo se permiten consultas SELECT")
    if len(texto) > MAX_LONGITUD_CONSULTA:
        raise ValueError(f"La consulta supera los {MAX_LONGITUD_CONSULTA} caracteres")

    # b) Sin comentarios ni palabras prohibidas (ignorando lo que está dentro de literales).
    try:
        tokens = sqlglot.tokenize(texto, dialect="postgres")
    except SqlglotError as exc:
        raise ValueError(f"SQL inválido: {_mensaje_sql(exc)}") from exc
    for token in tokens:
        if token.comments:
            raise ValueError("No se permiten comentarios en la consulta")
        if token.token_type not in TOKENS_DE_TEXTO and token.text.upper() in PALABRAS_PROHIBIDAS:
            raise ValueError(f"Palabra prohibida en la consulta: {token.text.upper()}")

    # c) Una sola sentencia, raíz SELECT, sin DML/DDL, funciones y tablas permitidas.
    try:
        sentencias = [s for s in sqlglot.parse(texto, dialect="postgres") if s is not None]
    except SqlglotError as exc:
        raise ValueError(f"SQL inválido: {_mensaje_sql(exc)}") from exc
    if len(sentencias) != 1:
        raise ValueError("Solo se permite una sentencia SQL por consulta")
    arbol = sentencias[0]
    if not isinstance(arbol, (exp.Select, exp.SetOperation)):
        raise ValueError("Solo se permiten consultas SELECT")

    for nodo in arbol.walk():
        if isinstance(nodo, NODOS_PROHIBIDOS):
            raise ValueError(f"Operación no permitida en la consulta: {type(nodo).__name__}")
        if isinstance(nodo, exp.Select) and nodo.args.get("locks"):
            raise ValueError("No se permiten bloqueos (FOR UPDATE / FOR SHARE)")
        if isinstance(nodo, exp.Anonymous) and nodo.name.lower() not in FUNCIONES_ANONIMAS_PERMITIDAS:
            raise ValueError(f"Función no permitida: {nodo.name}")
        if isinstance(nodo, exp.Table):
            if nodo.catalog or (nodo.db and nodo.db.lower() != "public"):
                raise ValueError(f"Esquema no permitido: {nodo.db or nodo.catalog}")
            if nodo.name.lower() not in TABLAS_PERMITIDAS:
                raise ValueError(
                    f"Tabla no permitida: {nodo.name or '(expresión)'}. "
                    f"Tablas disponibles: {', '.join(sorted(TABLAS_PERMITIDAS))}"
                )

    # d) Tope de filas: sin LIMIT, o con uno mayor al permitido, se fuerza max_filas + 1
    #    (la fila de más permite avisar que el resultado se truncó).
    tope = max_filas + 1
    limite = arbol.args.get("limit")
    valor = limite.expression if isinstance(limite, exp.Limit) else None
    if not (isinstance(valor, exp.Literal) and valor.is_int and int(valor.name) <= tope):
        arbol = arbol.limit(tope)

    return arbol.sql(dialect="postgres")
