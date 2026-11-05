-- Rol de solo lectura del microservicio de IA (ia-agent-service) con aislamiento por organismo.
--
-- El agente genera SQL con un LLM; este rol es la barrera real de la base (la validación en
-- Python es solo la primera capa): solo puede leer 9 tablas de rendición, nunca usuarios,
-- responsables ni registro_actividad, y la RLS le muestra únicamente las filas del organismo
-- que el servicio fija en cada consulta con `set_config('app.organismo_id', <id>, true)`.
-- Sin ese valor no ve ninguna fila. El dueño de las tablas (el backend/TypeORM) no pasa por RLS.
--
-- Uso (idempotente; la clave NO queda en el archivo):
--   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v clave='<clave>' < scripts/crear-rol-ia-lectura.sql
--
-- Cuándo correrlo:
--   * Después de que el backend haya creado las tablas (`synchronize`).
--   * De nuevo tras un `DB_DROP_SCHEMA=true`: los grants y las políticas caen con las tablas.
--
-- Límite conocido: el rol podría llamar `set_config('app.organismo_id', ...)` y cambiar su propio
-- alcance. Lo impide la lista blanca de funciones de `sql_guard.py` (el LLM no puede emitir esa
-- llamada); si alguna vez se acepta SQL de otro origen, esta defensa deja de alcanzar.

\set ON_ERROR_STOP on

-- Rol: se crea si no existe y la clave se actualiza siempre.
SELECT format('CREATE ROLE siada_ia_ro LOGIN PASSWORD %L', :'clave')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'siada_ia_ro')
\gexec

SELECT format('ALTER ROLE siada_ia_ro WITH LOGIN PASSWORD %L', :'clave')
\gexec

ALTER ROLE siada_ia_ro SET default_transaction_read_only = on;
ALTER ROLE siada_ia_ro SET statement_timeout = '5s';
ALTER ROLE siada_ia_ro SET idle_in_transaction_session_timeout = '10s';

SELECT format('GRANT CONNECT ON DATABASE %I TO siada_ia_ro', current_database())
\gexec

GRANT USAGE ON SCHEMA public TO siada_ia_ro;

-- Solo SELECT y solo sobre estas tablas.
GRANT SELECT ON
  organismos,
  cuentas_anuales,
  cuentas_mensuales,
  libros_banco,
  transacciones_libro_banco,
  ingresos_egresos,
  transacciones_ingresos_egresos,
  observaciones,
  ejecuciones_auditoria
TO siada_ia_ro;

-- Organismo de la consulta en curso. Sin valor (o vacío) devuelve NULL y ninguna política deja pasar filas.
CREATE OR REPLACE FUNCTION organismo_actual() RETURNS integer
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.organismo_id', true), '')::integer $$;

ALTER TABLE organismos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_anuales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_mensuales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE libros_banco                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_libro_banco      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_egresos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_ingresos_egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecuciones_auditoria          ENABLE ROW LEVEL SECURITY;

-- Políticas: cada tabla hereda el filtro de su padre con EXISTS. La subconsulta también pasa por
-- la RLS del padre (el rol no es dueño), así que la cadena organismo → cuenta anual → cuenta
-- mensual → libro → transacción queda cerrada.
DROP POLICY IF EXISTS ia_ro_select ON organismos;
CREATE POLICY ia_ro_select ON organismos FOR SELECT TO siada_ia_ro
  USING (id = organismo_actual());

DROP POLICY IF EXISTS ia_ro_select ON cuentas_anuales;
CREATE POLICY ia_ro_select ON cuentas_anuales FOR SELECT TO siada_ia_ro
  USING (organismo_id = organismo_actual());

DROP POLICY IF EXISTS ia_ro_select ON cuentas_mensuales;
CREATE POLICY ia_ro_select ON cuentas_mensuales FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM cuentas_anuales ca WHERE ca.id = cuentas_mensuales.cuenta_anual_id));

DROP POLICY IF EXISTS ia_ro_select ON libros_banco;
CREATE POLICY ia_ro_select ON libros_banco FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM cuentas_mensuales cm WHERE cm.id = libros_banco.cuenta_mensual_id));

DROP POLICY IF EXISTS ia_ro_select ON transacciones_libro_banco;
CREATE POLICY ia_ro_select ON transacciones_libro_banco FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM libros_banco lb WHERE lb.id = transacciones_libro_banco.libro_banco_id));

DROP POLICY IF EXISTS ia_ro_select ON ingresos_egresos;
CREATE POLICY ia_ro_select ON ingresos_egresos FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM cuentas_mensuales cm WHERE cm.id = ingresos_egresos.cuenta_mensual_id));

DROP POLICY IF EXISTS ia_ro_select ON transacciones_ingresos_egresos;
CREATE POLICY ia_ro_select ON transacciones_ingresos_egresos FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM ingresos_egresos ie WHERE ie.id = transacciones_ingresos_egresos.ingresos_egresos_id));

DROP POLICY IF EXISTS ia_ro_select ON observaciones;
CREATE POLICY ia_ro_select ON observaciones FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM cuentas_mensuales cm WHERE cm.id = observaciones.cuenta_mensual_id));

DROP POLICY IF EXISTS ia_ro_select ON ejecuciones_auditoria;
CREATE POLICY ia_ro_select ON ejecuciones_auditoria FOR SELECT TO siada_ia_ro
  USING (EXISTS (SELECT 1 FROM cuentas_mensuales cm WHERE cm.id = ejecuciones_auditoria.cuenta_mensual_id));
