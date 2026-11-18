"""Esquema que ve el LLM para escribir SQL.

Es un resumen a mano de las 13 tablas de rendición que expone `siada_ia_ro`
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
        "raci",
        "transacciones_raci",
        "rai",
        "transacciones_rai",
        "observaciones",
        "ejecuciones_auditoria",
    }
)

# Lo que el auditor puede ver de dónde salió un dato: nunca nombres de tablas.
AREA_POR_TABLA: dict[str, str] = {
    "organismos": "datos del organismo",
    "cuentas_anuales": "rendiciones",
    "cuentas_mensuales": "rendiciones",
    "libros_banco": "libro banco",
    "transacciones_libro_banco": "libro banco",
    "ingresos_egresos": "libro de ingresos y egresos",
    "transacciones_ingresos_egresos": "libro de ingresos y egresos",
    "raci": "libro RACI (compromisos, devengados y pagos)",
    "transacciones_raci": "libro RACI (compromisos, devengados y pagos)",
    "rai": "libro RAI (ingresos)",
    "transacciones_rai": "libro RAI (ingresos)",
    "observaciones": "hallazgos de auditoría",
    "ejecuciones_auditoria": "hallazgos de auditoría",
}

# Reemplazo de un nombre de tabla que se le escapó al modelo en su respuesta (con artículo, para que lea bien).
NOMBRE_AMIGABLE_POR_TABLA: dict[str, str] = {
    "organismos": "los organismos",
    "cuentas_anuales": "los ejercicios fiscales",
    "cuentas_mensuales": "las rendiciones mensuales",
    "libros_banco": "el libro banco",
    "transacciones_libro_banco": "los movimientos del libro banco",
    "ingresos_egresos": "el libro de ingresos y egresos",
    "transacciones_ingresos_egresos": "los movimientos del libro de ingresos y egresos",
    "raci": "el libro RACI",
    "transacciones_raci": "los asientos del libro RACI",
    "rai": "el libro RAI",
    "transacciones_rai": "los asientos del libro RAI",
    "observaciones": "los hallazgos de auditoría",
    "ejecuciones_auditoria": "las ejecuciones de auditoría",
}

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

TABLE raci (  -- un solo libro RACI (Registro Analítico de Compromisos e Imputaciones) por cuenta mensual; es opcional
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  fecha_creacion timestamp,
  subido_por_id integer,
  hash_contenido char(64)
)

TABLE transacciones_raci (  -- asientos del mes del RACI; cada asiento trae UNA sola etapa (compromiso, devengado o pago) y las otras en 0
  id integer PRIMARY KEY,
  asiento integer,
  fecha varchar,
  expediente varchar,
  concepto text,
  compromiso_instrumento_legal varchar,
  compromiso_del_mes numeric(14,2),
  compromiso_acumulado numeric(14,2),
  compromiso_orden_provision varchar,
  devengado_del_mes numeric(14,2),
  devengado_acumulado numeric(14,2),
  devengado_saldo numeric(14,2),  -- compromiso acumulado - devengado acumulado
  devengado_orden_pago varchar,
  pago_numero_cheque varchar,  -- se cruza con el cheque del libro banco
  pago_del_mes numeric(14,2),
  pago_acumulado numeric(14,2),
  pago_saldo_a_pagar numeric(14,2),  -- devengado acumulado - pago acumulado
  raci_id integer REFERENCES raci(id)
)

TABLE rai (  -- un solo libro RAI (Registro Analítico de Ingresos) por cuenta mensual; es opcional
  id integer PRIMARY KEY,
  cuenta_mensual_id integer REFERENCES cuentas_mensuales(id),
  fecha_creacion timestamp,
  subido_por_id integer,
  hash_contenido char(64)
)

TABLE transacciones_rai (  -- asientos de ingresos del mes del RAI
  id integer PRIMARY KEY,
  asiento integer,  -- puede ser NULL
  fecha varchar,
  planilla_numero varchar,
  concepto text,
  ingresos_diarios numeric(14,2),
  ingresos_mensuales numeric(14,2),  -- acumulado del mes
  ingresos_acumulados numeric(14,2),  -- acumulado del ejercicio
  saldo numeric(14,2),  -- total autorizado - acumulados
  rai_id integer REFERENCES rai(id)
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
  codigo_regla varchar,  -- V1 caja interna | V2 banco interno (Ingresos y Egresos) | V3 saldos del libro banco | V4 secuencia del gasto (RACI) | V5 límite presupuestario (RACI) | V6 límite de pago (RACI) | V7 suma mensual (RAI) | C1 devengado RACI vs egresos | C2 pagos RACI vs banco haber | C3 ingresos RAI vs Ingresos y Egresos | C4 depósitos vs banco | C5 retiros vs banco | C6 saldo final vs banco | P1 cheque del RACI existe en el banco | P2 monto del cheque RACI vs banco | P3 ingresos RAI respaldados en Ingresos y Egresos | F1 fechas fuera del mes o ejercicio
  tipo varchar,  -- INTERNA | CRUZAMIENTO | INTEGRIDAD | SEMANTICA | FECHAS
  descripcion text,
  libro_origen varchar,  -- LIBRO_BANCO | INGRESOS_EGRESOS | RACI | RAI
  estado varchar,  -- ABIERTA | CONFIRMADA | DESCARTADA
  transaccion_libro_banco_id integer REFERENCES transacciones_libro_banco(id),
  transaccion_ingreso_egreso_id integer REFERENCES transacciones_ingresos_egresos(id),
  transaccion_raci_id integer REFERENCES transacciones_raci(id),
  transaccion_rai_id integer REFERENCES transacciones_rai(id),
  valor_informado numeric(14,2),
  valor_calculado numeric(14,2),
  diferencia numeric(14,2),
  motivo_descarte text,
  revisada_por_id integer,
  revisada_en timestamptz,
  fecha_creacion timestamp
)
"""
