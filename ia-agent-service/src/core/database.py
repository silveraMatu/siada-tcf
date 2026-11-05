from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from core.config import settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    return create_async_engine(
        settings.DATABASE_URL.get_secret_value(),
        pool_size=3,
        max_overflow=2,
        pool_pre_ping=True,
    )


@asynccontextmanager
async def get_db_session(organismo_id: int) -> AsyncIterator[AsyncSession]:
    """Sesión de solo lectura atada a un organismo.

    La RLS del rol `siada_ia_ro` filtra por `app.organismo_id`, que se fija acá y no
    puede cambiar el LLM. Todo corre en una única transacción que siempre se revierte.
    """
    async with AsyncSession(get_engine(), expire_on_commit=False) as session:
        try:
            # La transacción arranca sola con la primera sentencia, que debe ser esta.
            await session.execute(text("SET TRANSACTION READ ONLY"))
            await session.execute(
                text(f"SET LOCAL statement_timeout = '{int(settings.SQL_TIMEOUT_SEGUNDOS)}s'")
            )
            await session.execute(
                text("SELECT set_config('app.organismo_id', :id, true)"),
                {"id": str(organismo_id)},
            )
            yield session
        finally:
            await session.rollback()


async def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
        get_engine.cache_clear()
