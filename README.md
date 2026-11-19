# SIADA

Sistema Inteligente de Analítica de Datos para Auditoría: carga las rendiciones de cuentas mensuales de un organismo (libro banco, ingresos y egresos, RACI y RAI), ejecuta reglas de auditoría determinísticas sobre ellas y ofrece al auditor un asistente de IA que consulta los datos del organismo que audita.

## Estructura del repositorio

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `backend/` | API REST (puerto 3000, prefijo `/api/v1`), reglas de auditoría y base de datos | NestJS 12, TypeORM, PostgreSQL 16 |
| `frontend/` | Aplicación web (puerto 5173) | React, Vite, Tailwind |
| `ia-agent-service/` | Microservicio del asistente de IA (puerto 8000). **Opcional**: sin él todo funciona, salvo el asistente | FastAPI, LangGraph |

El navegador solo habla con el backend. El backend es el único que llama al servicio de IA.

## Requisitos

- **Node.js 22** y npm
- **Docker** con Docker Compose (para PostgreSQL)
- **uv** y Python 3.14, solo si vas a usar el asistente de IA (`uv` descarga Python por su cuenta)
- `openssl`, para generar claves

## Puesta en marcha

Los pasos 1 a 4 alcanzan para tener el sistema funcionando. El paso 5 agrega el asistente de IA.

### 1. Configurar y levantar la base de datos

```bash
cd backend
cp .env.example .env
```

Completa `backend/.env`. Estas variables son obligatorias:

```bash
POSTGRES_USER=siada
POSTGRES_PASS=una-clave-segura
POSTGRES_DB=siada_db
JWT_SECRET=...                 # openssl rand -hex 32  (32 caracteres o más)

# Primer administrador (lo crea `npm run crear-admin`)
ADMIN_EMAIL=admin@ejemplo.com
ADMIN_PASSWORD=una-clave-segura
ADMIN_DNI=12345678             # 7 u 8 dígitos
ADMIN_NOMBRE=Nombre
ADMIN_APELLIDO=Apellido
```

Después levanta PostgreSQL (queda accesible solo desde tu máquina, en `127.0.0.1:5432`):

```bash
docker compose up -d postgres
```

### 2. Instalar, crear el esquema y el administrador

```bash
npm install
npm run crear-admin
```

No hay migraciones: el esquema se genera solo a partir de las entidades al arrancar. `crear-admin` es idempotente.

### 3. Cargar los datos de prueba (opcional, recomendado)

```bash
npm run seed
```

Crea el organismo «Municipalidad Demo (seed)» con tres rendiciones de 2026 y un usuario por rol. Es idempotente y no corre con `NODE_ENV=production`. Ver [Usuarios de prueba](#usuarios-de-prueba).

### 4. Levantar el backend y el frontend

En una terminal:

```bash
cd backend
npm run start:dev
```

En otra:

```bash
cd frontend
npm install
npm run dev
```

- Aplicación: http://localhost:5173
- API: http://localhost:3000/api/v1
- Documentación Swagger: http://localhost:3000/docs

El frontend reenvía `/api` al backend, así que no necesita configuración. Si el backend corre en otra dirección, define `VITE_API_URL` en `frontend/.env`.

### 5. Asistente de IA (opcional)

El asistente necesita un proveedor de modelos compatible con OpenAI (por defecto Ollama Cloud), que puede requerir una cuenta con créditos.

**a) Rol de solo lectura en la base.** El agente consulta la base con un rol propio que solo puede leer las tablas de rendición y solo ve las filas del organismo que se está auditando. Créalo después del paso 2 (las tablas deben existir). Elige una clave y guárdala, porque se usa de nuevo en el paso c:

```bash
cd backend
docker compose exec -T postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> \
  -v clave='<clave-del-rol-ia>' < scripts/crear-rol-ia-lectura.sql
```

Es idempotente y hay que repetirlo si alguna vez se recrea la base.

**b) Configurar el servicio.**

```bash
cd ia-agent-service
cp .env.example .env
```

Completa `ia-agent-service/.env`:

| Variable | Valor |
|---|---|
| `LLM_API_KEY` | Clave de tu proveedor de modelos |
| `LLM_MODEL` | Un modelo disponible en tu proveedor (ver nota) |
| `SERVICE_API_KEY` | Una clave de 32 caracteres o más: `openssl rand -hex 32` |
| `DATABASE_URL` | `postgresql+asyncpg://siada_ia_ro:<clave-del-rol-ia>@127.0.0.1:5432/<POSTGRES_DB>` |

> El modelo que trae `.env.example` puede haber sido retirado por el proveedor. Para ver los disponibles:
> `curl https://ollama.com/v1/models -H "Authorization: Bearer <LLM_API_KEY>"`

**c) Conectar el backend.** Agrega a `backend/.env` y reinicia el backend:

```bash
IA_SERVICE_URL=http://127.0.0.1:8000
IA_SERVICE_API_KEY=<la misma SERVICE_API_KEY del servicio>
```

**d) Levantar el servicio.**

```bash
cd ia-agent-service
uv sync
uv run uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

## Usuarios de prueba

Tras `npm run seed`, todos con la clave `siada123`:

| Rol | Email | Qué hace |
|---|---|---|
| RESPONSABLE | `seed.responsable@siada.dev` | Carga los libros y presenta la rendición de su organismo |
| AUDITOR | `seed.auditor@siada.dev` | Ejecuta la auditoría, revisa los hallazgos y la cierra; usa el asistente de IA |
| JUEZ_TRAMITE | `seed.juez@siada.dev` | Asigna auditores a los organismos |
| SUPERVISOR | `seed.supervisor@siada.dev` | Consulta la bitácora de actividad |
| ADMIN | el de `ADMIN_EMAIL` | Gestiona usuarios, organismos y responsables |

Rendiciones del organismo de prueba:

- **Mes 1:** en borrador, para probar la carga de libros y la presentación.
- **Mes 2:** presentada y sin errores; pasa las 17 reglas.
- **Mes 3:** presentada con errores sembrados (V1, V3, V7, P1 y F1), para ver los hallazgos.

## Comandos útiles

| Dónde | Comando | Para qué |
|---|---|---|
| `backend/` | `npm test` | Pruebas unitarias (reglas de auditoría y casos de uso) |
| `backend/` | `npm run test:e2e` | Pruebas e2e contra la base **real** del `.env`: crean datos de prueba y no los borran. No las corras contra una base con datos que importen |
| `backend/` | `npm run lint` · `npm run build` · `npm run format` | Lint (oxlint), compilación y formato |
| `frontend/` | `npm test` · `npm run lint` · `npm run build` | Pruebas, lint y compilación |
| `ia-agent-service/` | `uv run pytest` | Pruebas del servicio de IA |

## Reconstruir la base desde cero

Hace falta cuando cambia el tipo de una columna o un enum y el esquema no se puede actualizar sobre filas existentes. **Borra todos los datos.**

1. En `backend/.env`, pon `DB_DROP_SCHEMA=true` (se ignora si `NODE_ENV=production`).
2. Arranca el backend **una sola vez** y detenlo.
3. Vuelve a poner `DB_DROP_SCHEMA=false`.
4. Repite `npm run crear-admin`, `npm run seed` y, si usas el asistente, el script del rol de IA (paso 5a).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| El backend no arranca y menciona `POSTGRES_*` o `JWT_SECRET` | Faltan en `backend/.env`; no tienen valor por defecto. |
| `npm run start:dev` no levanta el servidor | Faltan las variables `ADMIN_*`: ese comando ejecuta antes `crear-admin`. |
| No conecta a la base | Comprueba que el contenedor esté sano (`docker compose ps`) y que el puerto 5432 no lo use otro PostgreSQL. |
| No puedo iniciar sesión | Con el seed, usa los emails de arriba y la clave `siada123`. Para el admin, el email y la clave de `backend/.env`. |
| El asistente responde 503 | Faltan `IA_SERVICE_URL` o `IA_SERVICE_API_KEY` en `backend/.env`. |
| El asistente responde 502 | El servicio de IA está apagado, o el proveedor rechaza la llamada: mira el log del servicio. Un 410 indica que el modelo fue retirado; un 402, que faltan créditos. |
| En el log de la IA aparece `permission denied for table …` | Falta correr `scripts/crear-rol-ia-lectura.sql`, o hay que repetirlo tras recrear la base. |
| El asistente dice que no audita ningún organismo | El auditor no tiene organismos asignados. Asígnaselos con el usuario juez o administrador. |

## Seguridad

- `backend/.env` e `ia-agent-service/.env` contienen claves y están ignorados por git. No los subas.
- Cambia todas las claves de ejemplo antes de usar el sistema fuera de tu máquina.
- La clave del rol de IA (`siada_ia_ro`) debe coincidir en el script SQL y en `DATABASE_URL`.
