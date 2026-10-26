import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../../domain/rules/validations.js';
import {
  EstadoValidacion,
  type ResultadoValidacion,
} from '../../domain/types/auditoria.types.js';
import { aResumen, componerResultados } from './resultados-ejecucion.js';

const observacion = (id: number, codigoRegla: validationsCode) =>
  new Observaciones({
    id,
    cuentaMensualId: 7,
    codigoRegla,
    tipo: validationsType.INTERNA,
    descripcion: 'x',
    libroOrigen: LibroOrigen.LIBRO_BANCO,
    estado: EstadoObservacion.ABIERTA,
  });

describe('resultados de una ejecución', () => {
  it('aResumen guarda la cobertura de la regla y deja afuera las observaciones', () => {
    const resultado: ResultadoValidacion = {
      codigoRegla: validationsCode.V3,
      estado: EstadoValidacion.FALLO,
      filasEvaluadas: 4,
      librosFaltantes: [],
      observaciones: [observacion(1, validationsCode.V3)],
    };

    expect(aResumen(resultado)).toEqual({
      codigoRegla: validationsCode.V3,
      estado: EstadoValidacion.FALLO,
      filasEvaluadas: 4,
      librosFaltantes: [],
    });
  });

  it('aResumen conserva el mensaje y los libros faltantes cuando la regla no corrió', () => {
    const resultado: ResultadoValidacion = {
      codigoRegla: validationsCode.C4,
      estado: EstadoValidacion.FALTAN_LIBROS,
      mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
      filasEvaluadas: null,
      librosFaltantes: ['INGRESOS_EGRESOS'],
      observaciones: [],
    };

    expect(aResumen(resultado)).toEqual({
      codigoRegla: validationsCode.C4,
      estado: EstadoValidacion.FALTAN_LIBROS,
      mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
      filasEvaluadas: null,
      librosFaltantes: ['INGRESOS_EGRESOS'],
    });
  });

  it('componerResultados reparte las observaciones por regla y conserva el orden de las reglas', () => {
    const resumenes = [
      aResumen({
        codigoRegla: validationsCode.V1,
        estado: EstadoValidacion.VERIFICADO,
        filasEvaluadas: 2,
        librosFaltantes: [],
        observaciones: [],
      }),
      aResumen({
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.FALLO,
        filasEvaluadas: 3,
        librosFaltantes: [],
        observaciones: [],
      }),
    ];
    const observaciones = [
      observacion(1, validationsCode.V3),
      observacion(2, validationsCode.V3),
    ];

    const resultados = componerResultados(resumenes, observaciones);

    expect(resultados.map((r) => r.codigoRegla)).toEqual([
      validationsCode.V1,
      validationsCode.V3,
    ]);
    expect(resultados[0].observaciones).toEqual([]);
    expect(resultados[1].observaciones.map((o) => o.id)).toEqual([1, 2]);
  });
});
