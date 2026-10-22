-- Migra cuentas_mensuales.estado del enum viejo (pendiente_carga, cargada, ...) al nuevo
-- (EN_BORRADOR, LISTO_PARA_AUDITAR, EN_AUDITORIA, AUDITADA, CON_OBSERVACIONES).
--
-- Hay que correrlo UNA vez en cada base existente ANTES de arrancar con el código nuevo:
-- el synchronize de TypeORM no puede convertir las filas con valores viejos y la app no arranca.
-- Es idempotente: si el tipo ya no tiene 'pendiente_carga', no hace nada.
--
--   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/migrar-estado-cuenta-mensual.sql
--
-- Equivalencias: pendiente_carga, cargada, rechazada -> EN_BORRADOR;
-- lista_para_auditar -> LISTO_PARA_AUDITAR; con_observaciones -> CON_OBSERVACIONES;
-- auditada, cerrada -> AUDITADA.

DO $$
BEGIN
  IF to_regtype('cuentas_mensuales_estado_enum') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_enum
       WHERE enumtypid = to_regtype('cuentas_mensuales_estado_enum')
         AND enumlabel = 'pendiente_carga'
     ) THEN
    RAISE NOTICE 'cuentas_mensuales.estado no usa el enum viejo: no hay nada que migrar';
    RETURN;
  END IF;

  ALTER TABLE cuentas_mensuales ALTER COLUMN estado DROP DEFAULT;
  ALTER TYPE cuentas_mensuales_estado_enum RENAME TO cuentas_mensuales_estado_enum_old;
  CREATE TYPE cuentas_mensuales_estado_enum AS ENUM (
    'EN_BORRADOR',
    'LISTO_PARA_AUDITAR',
    'EN_AUDITORIA',
    'AUDITADA',
    'CON_OBSERVACIONES'
  );
  ALTER TABLE cuentas_mensuales
    ALTER COLUMN estado TYPE cuentas_mensuales_estado_enum
    USING (
      CASE estado::text
        WHEN 'lista_para_auditar' THEN 'LISTO_PARA_AUDITAR'
        WHEN 'con_observaciones' THEN 'CON_OBSERVACIONES'
        WHEN 'auditada' THEN 'AUDITADA'
        WHEN 'cerrada' THEN 'AUDITADA'
        ELSE 'EN_BORRADOR'
      END
    )::cuentas_mensuales_estado_enum;
  ALTER TABLE cuentas_mensuales ALTER COLUMN estado SET DEFAULT 'EN_BORRADOR';
  DROP TYPE cuentas_mensuales_estado_enum_old;
END
$$;
