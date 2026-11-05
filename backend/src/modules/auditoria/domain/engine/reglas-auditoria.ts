import { ChequeExistenciaP1Rule } from '../rules/cheque-existencia.rule.js';
import { ChequeMontoP2Rule } from '../rules/cheque-monto.rule.js';
import { CruceDepositosC4Rule } from '../rules/cruce-ingresos-egresos-banco-depositos.rule.js';
import { CruceRetirosC5Rule } from '../rules/cruce-ingresos-egresos-banco-retiros.rule.js';
import { CruceSaldoFinalC6Rule } from '../rules/cruce-ingresos-egresos-banco-saldofinal.rule.js';
import { CruceDevengadoC1Rule } from '../rules/cruce-raci-ingresos-egresos-devengado.rule.js';
import { CrucePagadoC2Rule } from '../rules/cruce-raci-ingresos-egresos-pagado.rule.js';
import { FechasPeriodoF1Rule } from '../rules/fechas-periodo.rule.js';
import { IngresosEgresosV2Rule } from '../rules/ingresos-egresos-banco.rule.js';
import { IngresosEgresosV1Rule } from '../rules/ingresos-egresos-caja.rule.js';
import { LibroBancoV3Rule } from '../rules/libro-banco-saldo.rule.js';
import { RaciLimitePagoV6Rule } from '../rules/raci-limite-pago.rule.js';
import { RaciLimitePresupuestarioV5Rule } from '../rules/raci-limite-presupuestario.rule.js';
import { RaciSecuenciaGastoV4Rule } from '../rules/raci-secuencia-gasto.rule.js';
import type { ReglaAuditoria } from '../rules/regla-auditoria.interface.js';

//las reglas del motor, en el orden de la respuesta (el de los grupos del documento de reglas de negocio:
//validaciones internas, cruces entre libros, integridad de comprobantes y fechas). Subir VERSION_REGLAS cuando
//cambie esta lista o el comportamiento de una regla
export const crearReglasAuditoria = (): ReglaAuditoria[] => [
  new IngresosEgresosV1Rule(),
  new IngresosEgresosV2Rule(),
  new LibroBancoV3Rule(),
  new RaciSecuenciaGastoV4Rule(),
  new RaciLimitePresupuestarioV5Rule(),
  new RaciLimitePagoV6Rule(),
  new CruceDevengadoC1Rule(),
  new CrucePagadoC2Rule(),
  new CruceDepositosC4Rule(),
  new CruceRetirosC5Rule(),
  new CruceSaldoFinalC6Rule(),
  new ChequeExistenciaP1Rule(),
  new ChequeMontoP2Rule(),
  new FechasPeriodoF1Rule(),
];
