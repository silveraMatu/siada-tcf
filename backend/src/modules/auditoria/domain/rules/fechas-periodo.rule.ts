import { Observaciones } from '../entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { ordenarPorFila } from './ingresos-egresos-saldos.js';
import { aCentavos } from './montos.js';
import { asientosRaiEnOrden } from './rai-suma-mensual.rule.js';
import { asientosEnOrden } from './raci-gasto-acumulado.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  descripcionRegla,
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

//F1: las fechas de las filas deben estar dentro del mes y el ejercicio de la rendición. Se omite la primera fila
//del banco y del libro de ingresos y egresos (la base, el saldo anterior, que puede traer la fecha del mes previo)
//y los asientos del RACI y del RAI sin movimiento en el mes (son bases de bloque). Una fecha ausente en el banco, que es
//opcional, no se marca; un texto que no es YYYY-MM-DD sí, porque el período no se puede comprobar
export class FechasPeriodoF1Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.F1;
  readonly descripcion = descripcionRegla[validationsCode.F1];
  //las dos obligatorias para presentar; el RACI, que es opcional, se revisa si está cargado
  readonly librosRequeridos: NombreLibro[] = [
    'LIBRO_BANCO',
    'INGRESOS_EGRESOS',
  ];

  execute(context: AuditoriaContext): ResultadoRegla {
    const { periodo } = context;
    if (!periodo) {
      return {
        codigoRegla: this.codigo,
        estado: EstadoValidacion.VERIFICADO,
        observaciones: [],
        filasEvaluadas: 0,
      };
    }

    const observaciones: Observaciones[] = [];
    let filasEvaluadas = 0;
    const nombrePeriodo = `${MESES[periodo.mes - 1]} de ${periodo.ejercicioFiscal}`;

    //devuelve el motivo si la fecha no corresponde al período, o null si está bien
    const revisar = (fecha: string): string | null => {
      const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
      if (!partes) return `no tiene el formato AAAA-MM-DD ("${fecha}")`;
      const anio = Number(partes[1]);
      const mes = Number(partes[2]);
      return anio === periodo.ejercicioFiscal && mes === periodo.mes
        ? null
        : `${fecha} está fuera de ${nombrePeriodo}`;
    };
    const marcar = (
      libroOrigen: LibroOrigen,
      fila: Partial<{
        transaccionId: number;
        transaccionIngresoEgresoId: number;
        transaccionRaciId: number;
        transaccionRaiId: number;
      }>,
      donde: string,
      motivo: string,
    ) =>
      observaciones.push(
        new Observaciones({
          cuentaMensualId: context.cuentaMensualId,
          codigoRegla: this.codigo,
          tipo: validationsType.FECHAS,
          descripcion: `Fecha fuera de periodo: la fecha de ${donde} ${motivo}.`,
          libroOrigen,
          estado: EstadoObservacion.ABIERTA,
          ...fila,
        }),
      );

    for (const libro of context.librosBanco ?? []) {
      const filas = [...libro.transacciones].sort(
        (a, b) => (a.id ?? 0) - (b.id ?? 0),
      );
      for (const tx of filas.slice(1)) {
        if (tx.fecha === null || tx.fecha.trim() === '') continue;
        filasEvaluadas++;
        const motivo = revisar(tx.fecha);
        if (motivo)
          marcar(
            LibroOrigen.LIBRO_BANCO,
            { transaccionId: tx.id },
            `una fila del Libro Banco${libro.numeroCuentaCte ? ` (cuenta ${libro.numeroCuentaCte})` : ''}`,
            motivo,
          );
      }
    }

    for (const tx of ordenarPorFila(
      context.ingresosEgresos?.transacciones ?? [],
    ).slice(1)) {
      filasEvaluadas++;
      const motivo = revisar(tx.fecha);
      if (motivo)
        marcar(
          LibroOrigen.INGRESOS_EGRESOS,
          { transaccionIngresoEgresoId: tx.id },
          `la fila ${tx.fila} de Ingresos y Egresos`,
          motivo,
        );
    }

    for (const tx of asientosEnOrden(context)) {
      const conMovimiento =
        aCentavos(tx.compromisoDelMes) !== 0 ||
        aCentavos(tx.devengadoDelMes) !== 0 ||
        aCentavos(tx.pagoDelMes) !== 0;
      if (!conMovimiento) continue;
      filasEvaluadas++;
      const motivo = revisar(tx.fecha);
      if (motivo)
        marcar(
          LibroOrigen.RACI,
          { transaccionRaciId: tx.id },
          `el asiento ${tx.asiento} del RACI`,
          motivo,
        );
    }

    //los ingresos del RAI con movimiento: sin importe en el día no hay fecha que controlar
    for (const tx of asientosRaiEnOrden(context)) {
      if (aCentavos(tx.ingresosDiarios) === 0) continue;
      filasEvaluadas++;
      const motivo = revisar(tx.fecha);
      if (motivo)
        marcar(
          LibroOrigen.RAI,
          { transaccionRaiId: tx.id },
          tx.asiento !== null
            ? `el asiento ${tx.asiento} del RAI`
            : `el ingreso "${tx.concepto}" del RAI`,
          motivo,
        );
    }

    return {
      codigoRegla: this.codigo,
      estado:
        observaciones.length > 0
          ? EstadoValidacion.FALLO
          : EstadoValidacion.VERIFICADO,
      observaciones,
      filasEvaluadas,
    };
  }
}
