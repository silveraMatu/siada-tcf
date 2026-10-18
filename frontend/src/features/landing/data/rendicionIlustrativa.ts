// Datos FICTICIOS para la demostración de la landing. No corresponden a ningún
// organismo, cuenta ni rendición real.

export interface Movimiento {
  fecha: string;
  concepto: string;
  deposito: number | null;
  retiro: number | null;
}

export interface RendicionIlustrativa {
  organismo: string;
  periodo: string;
  saldoAnterior: number;
  saldoInformado: number;
  movimientos: Movimiento[];
}

export interface Conciliacion {
  totalDepositos: number;
  totalRetiros: number;
  saldoCalculado: number;
  diferencia: number;
  cuadra: boolean;
}

export const rendicionIlustrativa: RendicionIlustrativa = {
  organismo: 'Organismo de ejemplo',
  periodo: 'Marzo 2026',
  saldoAnterior: 1250000,
  saldoInformado: 1230000,
  movimientos: [
    {
      fecha: '03/03',
      concepto: 'Ingreso de coparticipación',
      deposito: 480000,
      retiro: null,
    },
    {
      fecha: '07/03',
      concepto: 'Pago a proveedor',
      deposito: null,
      retiro: 212400,
    },
    {
      fecha: '12/03',
      concepto: 'Servicios del mes',
      deposito: null,
      retiro: 150000,
    },
    {
      fecha: '21/03',
      concepto: 'Gastos de funcionamiento',
      deposito: null,
      retiro: 150000,
    },
  ],
};

// Trabajamos en centavos para que la comparación sea exacta.
const aCentavos = (importe: number) => Math.round(importe * 100);

/** Regla determinística: saldo anterior + depósitos − retiros = saldo informado. */
export function conciliar(rendicion: RendicionIlustrativa): Conciliacion {
  const totalDepositos = rendicion.movimientos.reduce(
    (suma, m) => suma + aCentavos(m.deposito ?? 0),
    0,
  );
  const totalRetiros = rendicion.movimientos.reduce(
    (suma, m) => suma + aCentavos(m.retiro ?? 0),
    0,
  );
  const saldoCalculado =
    aCentavos(rendicion.saldoAnterior) + totalDepositos - totalRetiros;
  const diferencia = aCentavos(rendicion.saldoInformado) - saldoCalculado;

  return {
    totalDepositos: totalDepositos / 100,
    totalRetiros: totalRetiros / 100,
    saldoCalculado: saldoCalculado / 100,
    diferencia: diferencia / 100,
    cuadra: diferencia === 0,
  };
}

const formato = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearImporte(importe: number): string {
  return formato.format(importe);
}
