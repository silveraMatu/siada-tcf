import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import type { AuditoriaContext } from '../rules/auditoria-context.js';
import type { ReglaAuditoria } from '../rules/regla-auditoria.interface.js';
import { validationsCode } from '../rules/validations.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoRegla,
} from '../types/auditoria.types.js';
import { MotorAuditoriaService } from './motor-auditoria.service.js';

//regla falsa: registra cuántas veces corrió y devuelve VERIFICADO
class ReglaFalsa implements ReglaAuditoria {
  descripcion = 'Regla falsa';
  ejecuciones = 0;

  constructor(
    public codigo: validationsCode,
    public librosRequeridos: NombreLibro[],
  ) {}

  execute(): ResultadoRegla {
    this.ejecuciones++;
    return {
      codigoRegla: this.codigo,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 3,
    };
  }
}

const libroBanco = new LibroBanco(7, null, [], 1);
const conLibroBanco: AuditoriaContext = {
  cuentaMensualId: 7,
  librosBanco: [libroBanco],
};
const sinLibros: AuditoriaContext = { cuentaMensualId: 7 };

describe('MotorAuditoriaService', () => {
  it('ejecuta la regla si están todos sus libros requeridos', () => {
    const regla = new ReglaFalsa(validationsCode.V3, ['LIBRO_BANCO']);

    const resultados = new MotorAuditoriaService([
      regla,
    ]).ejecutarAuditoriaCompleta(conLibroBanco);

    expect(regla.ejecuciones).toBe(1);
    expect(resultados).toEqual([
      {
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.VERIFICADO,
        observaciones: [],
        filasEvaluadas: 3,
        librosFaltantes: [],
      },
    ]);
  });

  it('no ejecuta la regla y devuelve FALTAN_LIBROS si el contexto no trae el libro', () => {
    const regla = new ReglaFalsa(validationsCode.V3, ['LIBRO_BANCO']);

    const resultados = new MotorAuditoriaService([
      regla,
    ]).ejecutarAuditoriaCompleta(sinLibros);

    expect(regla.ejecuciones).toBe(0);
    expect(resultados).toEqual([
      {
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.FALTAN_LIBROS,
        mensaje: 'Faltan libros requeridos: LIBRO_BANCO',
        observaciones: [],
        filasEvaluadas: null,
        librosFaltantes: ['LIBRO_BANCO'],
      },
    ]);
  });

  it('un arreglo de libros vacío cuenta como libro faltante', () => {
    const regla = new ReglaFalsa(validationsCode.V3, ['LIBRO_BANCO']);

    const [resultado] = new MotorAuditoriaService([
      regla,
    ]).ejecutarAuditoriaCompleta({ cuentaMensualId: 7, librosBanco: [] });

    expect(regla.ejecuciones).toBe(0);
    expect(resultado.estado).toBe(EstadoValidacion.FALTAN_LIBROS);
  });

  it('lista solo los libros que faltan, no los presentes', () => {
    const regla = new ReglaFalsa(validationsCode.V3, [
      'LIBRO_BANCO',
      'INGRESOS_EGRESOS',
      'RACI',
    ]);

    const [resultado] = new MotorAuditoriaService([
      regla,
    ]).ejecutarAuditoriaCompleta(conLibroBanco);

    expect(resultado.mensaje).toBe(
      'Faltan libros requeridos: INGRESOS_EGRESOS, RACI',
    );
    expect(resultado.librosFaltantes).toEqual(['INGRESOS_EGRESOS', 'RACI']);
    expect(resultado.filasEvaluadas).toBeNull();
  });

  it('con varias reglas, corre las que pueden y conserva el orden', () => {
    const posible = new ReglaFalsa(validationsCode.V3, ['LIBRO_BANCO']);
    const imposible = new ReglaFalsa(validationsCode.V3, ['RAI']);

    const resultados = new MotorAuditoriaService([
      imposible,
      posible,
    ]).ejecutarAuditoriaCompleta(conLibroBanco);

    expect(resultados.map((r) => r.estado)).toEqual([
      EstadoValidacion.FALTAN_LIBROS,
      EstadoValidacion.VERIFICADO,
    ]);
    expect(imposible.ejecuciones).toBe(0);
    expect(posible.ejecuciones).toBe(1);
  });

  it('el libro de ingresos y egresos cuenta como presente cuando el contexto lo trae', () => {
    const regla = new ReglaFalsa(validationsCode.V1, ['INGRESOS_EGRESOS']);
    const motor = new MotorAuditoriaService([regla]);

    const sinLibro = motor.ejecutarAuditoriaCompleta(sinLibros);
    const conLibro = motor.ejecutarAuditoriaCompleta({
      cuentaMensualId: 7,
      ingresosEgresos: new IngresosEgresos(7, null, [], 1),
    });

    expect(sinLibro[0].estado).toBe(EstadoValidacion.FALTAN_LIBROS);
    expect(sinLibro[0].mensaje).toBe(
      'Faltan libros requeridos: INGRESOS_EGRESOS',
    );
    expect(conLibro[0].estado).toBe(EstadoValidacion.VERIFICADO);
    expect(regla.ejecuciones).toBe(1);
  });

  it('una regla de cruce con solo uno de sus dos libros no corre', () => {
    const regla = new ReglaFalsa(validationsCode.C4, [
      'LIBRO_BANCO',
      'INGRESOS_EGRESOS',
    ]);

    const [resultado] = new MotorAuditoriaService([
      regla,
    ]).ejecutarAuditoriaCompleta(conLibroBanco);

    expect(regla.ejecuciones).toBe(0);
    expect(resultado.mensaje).toBe(
      'Faltan libros requeridos: INGRESOS_EGRESOS',
    );
  });

  it('una regla sin libros requeridos corre siempre', () => {
    const regla = new ReglaFalsa(validationsCode.V3, []);

    new MotorAuditoriaService([regla]).ejecutarAuditoriaCompleta(sinLibros);

    expect(regla.ejecuciones).toBe(1);
  });

  it('sin reglas devuelve una lista vacía', () => {
    expect(
      new MotorAuditoriaService([]).ejecutarAuditoriaCompleta(sinLibros),
    ).toEqual([]);
  });
});
