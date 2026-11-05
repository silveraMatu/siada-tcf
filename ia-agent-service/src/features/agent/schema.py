"""Esquema que ve el LLM para escribir SQL.

Es un resumen a mano de las 9 tablas de rendición que expone `siada_ia_ro`
(backend/scripts/crear-rol-ia-lectura.sql). Si el backend cambia una de estas tablas hay que
actualizar este texto: el esquema real es el de las entidades TypeORM del backend.
Cada columna va en su propia línea (`  nombre tipo`) para poder compararlo con la base.
"""

TABLAS_PERMITIDAS: frozenset[str] = frozenset(
    {
        "organismos",
        "cuentas_anuales",
        "cuentas_mensuales",
        "libros_banco",
        "transacciones_libro_banco",
        "ingresos_egresos",
        "transacciones_ingresos_egresos",
        "observaciones",
        "ejecuciones_auditoria",
    }
)

SCHEMA_PERMITIDO: str = """\
-- Base PostgreSQL de SIADA. Solo estas tablas existen y solo se ven los datos del organismo del auditor.
-- Los importes son pesos en numeric(14,2). Las fechas de los libros son varchar 'YYYY-MM-DD'
-- (usar fecha::date para comparar o agrupar por mes). Las columnas *_por_id y auditor_id apuntan a
-- usuarios, que NO se puede consultar.

TABLE organismos (  -- el organismo auditado
  id integer PRIMARY KEY,
  nombre varchar,
  rubro varchar,
  active boolean,
  fecha_creacion timestamp,
  auditor_id integer
)

TABLE cuentas_anuales (  -- una por organismo y ejercicio fiscal
  id integer PRIMARY KEY,
  ejercicio_fiscal integer,  -- año, p. ej. 2026
  organismo_id integer REFERENCES organismos(id),
  fecha_creacion timestamp
)

TABLE cuentas_mensuales (  -- la rendición de un mes
  id integer PRIMARY KEY,
  mes integer,  -- 1 a 12
  cuenta_anual_id integer REFERENCES cuentas_anuales(id),
  estado varchar,  -- EN_BORRADOR | LISTO_PARA_AUDITAR | EN_AUDITORIA | AUDITADA | CON_OBSERVACIONES
  fecha_creacion timestamp,
  presentada_por_id integer,
  presentada_en timestamptz
)

TABLE libros_banco (  -- un libro banco por número de cuenta corriente en cada cuenta mensual
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  numero_cuenta_cte varchar,
  fecha_creacion timestamp,
  subido_por_id integer,
  hash_contenido char(64)
)

TABLE transacciones_libro_banco (  -- filas de un libro banco; el saldo es acumulado
  id integer PRIMARY KEY,
  fecha varchar,
  cheque varchar,
  a_la_orden_de text,
  depositos numeric(14,2),
  retiro numeric(14,2),
  saldo numeric(14,2),
  libro_banco_id integer REFERENCES libros_banco(id)
)

TABLE ingresos_egresos (  -- un solo libro de Ingresos y Egresos por cuenta mensual
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  numero_cuenta_cte varchar,
  fecha_creacion timestamp,
  subido_por_id integer,
  hash_contenido char(64)
)

TABLE transacciones_ingresos_egresos (  -- filas del libro de Ingresos y Egresos, ordenadas por fila
  id integer PRIMARY KEY,
  fila integer,
  fecha varchar,
  concepto text,
  cheque varchar,
  comprobante varchar,
  caja_debe numeric(14,2),
  caja_haber numeric(14,2),
  caja_saldo numeric(14,2),
  banco_debe numeric(14,2),
  banco_haber numeric(14,2),
  banco_saldo numeric(14,2),
  egreso_inc_1 numeric(14,2),
  egreso_inc_2 numeric(14,2),
  egreso_inc_3 numeric(14,2),
  egreso_inc_4 numeric(14,2),
  egreso_inc_5 numeric(14,2),
  ingreso_municipal numeric(14,2),
  ingreso_otras numeric(14,2),
  cuentas_varias_concepto text,
  cuentas_varias_debe numeric(14,2),
  cuentas_varias_haber numeric(14,2),
  ingresos_egresos_id integer REFERENCES ingresos_egresos(id)
)

TABLE ejecuciones_auditoria (  -- cada corrida de las reglas sobre una cuenta mensual; la vigente es la de mayor id
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  version_reglas varchar,
  ejecutada_por_id integer,
  ejecutada_en timestamptz,
  resultados jsonb,
  cerrada_en timestamptz,
  cerrada_por_id integer,
  conclusion text,
  estado_final varchar  -- AUDITADA | CON_OBSERVACIONES, NULL si la auditoría sigue abierta
)

TABLE observaciones (  -- hallazgos de las reglas de auditoría
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  ejecucion_id integer REFERENCES ejecuciones_auditoria(id),
  codigo_regla varchar,  -- V1 caja interna | V2 banco interno (Ingresos y Egresos) | V3 saldos del libro banco | C4 depósitos vs banco | C5 retiros vs banco | C6 saldo final vs banco
  tipo varchar,  -- INTERNA | CRUZAMIENTO | INTEGRIDAD | SEMANTICA | FECHAS
  descripcion text,
  libro_origen varchar,  -- LIBRO_BANCO | INGRESOS_EGRESOS
  estado varchar,  -- ABIERTA | CONFIRMADA | DESCARTADA
  transaccion_libro_banco_id integer REFERENCES transacciones_libro_banco(id),
  transaccion_ingreso_egreso_id integer REFERENCES transacciones_ingresos_egresos(id),
  valor_informado numeric(14,2),
  valor_calculado numeric(14,2),
  diferencia numeric(14,2),
  motivo_descarte text,
  revisada_por_id integer,
  revisada_en timestamptz,
  fecha_creacion timestamp
)
"""
