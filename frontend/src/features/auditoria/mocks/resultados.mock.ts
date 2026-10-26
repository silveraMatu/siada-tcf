import type { Ejecucion, ResultadoValidacion } from '../types/auditoria.types';

/**
 * Resultados de ejemplo, uno por estado, para los tests. No se importa desde código de la aplicación:
 * la pantalla siempre usa los datos del endpoint.
 */
export const MOCK_RESULTADOS: ResultadoValidacion[] = [
  {
    codigoRegla: 'V3',
    descripcion: 'Saldo de cuenta',
    estado: 'FALLO',
    observaciones: [
      {
        id: 1,
        cuentaMensualId: 5,
        codigoRegla: 'V3',
        tipo: 'INTERNA',
        descripcion:
          'El saldo calculado (1300.00) no coincide con el saldo informado (1400.00). Diferencia: 100.00.',
        libroOrigen: 'LIBRO_BANCO',
        estado: 'ABIERTA',
        ejecucionId: 1,
        transaccionId: 12,
        transaccionIngresoEgresoId: null,
        valorInformado: 1400,
        valorCalculado: 1300,
        diferencia: 100,
        motivoDescarte: null,
        revisadaPorId: null,
        revisadaPor: null,
        revisadaEn: null,
      },
    ],
    filasEvaluadas: 9,
    librosFaltantes: [],
  },
  {
    codigoRegla: 'V1',
    descripcion: 'Fechas dentro del período',
    estado: 'VERIFICADO',
    observaciones: [],
    filasEvaluadas: 4,
    librosFaltantes: [],
  },
  {
    codigoRegla: 'V7',
    descripcion: 'Cruce con ingresos y egresos',
    estado: 'FALTAN_LIBROS',
    mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
    observaciones: [],
    filasEvaluadas: null,
    librosFaltantes: ['INGRESOS_EGRESOS'],
  },
];

/** Una ejecución en curso con esos resultados: la que devuelve `GET …/ejecucion` tras auditar. Solo para tests. */
export const MOCK_EJECUCION: Ejecucion = {
  id: 1,
  cuentaMensualId: 5,
  versionReglas: '1',
  ejecutadaPorId: 44,
  ejecutadaPor: { id: 44, nombre: 'Luis', apellido: 'Gómez' },
  ejecutadaEn: '2026-10-26T15:42:00.000Z',
  cerradaEn: null,
  cerradaPorId: null,
  cerradaPor: null,
  conclusion: null,
  estadoFinal: null,
  resultados: MOCK_RESULTADOS,
  observaciones: { abiertas: 1, confirmadas: 0, descartadas: 0 },
};
