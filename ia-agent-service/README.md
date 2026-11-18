# ia-agent-service

Microservicio del copiloto de IA de SIADA (FastAPI + LangGraph). Solo lo llama el backend NestJS; el navegador nunca.

## Levantarlo

```bash
cp .env.example .env     # completar LLM_API_KEY, SERVICE_API_KEY y DATABASE_URL
uv run uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

`DATABASE_URL` usa el rol de solo lectura `siada_ia_ro`, que crea `backend/scripts/crear-rol-ia-lectura.sql`.

## Contexto por rubro

El backend manda el rubro del organismo (código del enum `Rubro`, en `backend/src/modules/organismos/domain/enums/rubro.enum.ts`)
dentro de `metadatos_organismo`. El servicio elige con él un archivo de `src/features/agent/contextos/` y lo inyecta en el prompt
como un bloque de instrucciones propio, **fuera** de los bloques de datos.

- `contexto_rubro.py` carga los archivos al arrancar (si falta uno, no arranca) y cae en `OTROS` si el código es desconocido.
- El valor de la petición solo elige el archivo: nunca se copia al prompt.
- Sumar o quitar un rubro exige tocar el enum del backend, `_CATALOGO` en `contexto_rubro.py`, el archivo de `contextos/` y la
  lista de `frontend/src/features/organismos/types/index.ts`. El test `test_el_catalogo_coincide_con_el_enum_del_backend` avisa si se desalinean.
- Los contextos no citan leyes ni normas: eso corresponde a la capa jurídica (RAG), que irá aparte.

## Pruebas

```bash
uv run pytest
```
