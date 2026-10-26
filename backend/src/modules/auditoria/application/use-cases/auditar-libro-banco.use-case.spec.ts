import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { MotorAuditoriaService } from '../../domain/engine/motor-auditoria.service.js';
import { LibroBancoV3Rule } from '../../domain/rules/libro-banco-saldo.rule.js';
import { validationsCode } from '../../domain/rules/validations.js';
import { EstadoValidacion } from '../../domain/types/auditoria.types.js';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import { AuditarLibroBancoUseCase } from './auditar-libro-banco.use-case.js';

//puerto en memoria: guarda lo recibido y le asigna un id
class ObservacionRepositoryFalso extends ObservacionRepositoryPort {
  guardadas: Observaciones[][] = [];

  guardarVarias(observaciones: Observaciones[]): Promise<Observaciones[]> {
    this.guardadas.push(observaciones);
    return Promise.resolve(
      observaciones.map(
        (o, i) =>
          new Observaciones(
            o.cuentaMensualId,
            o.codigoRegla,
            o.tipo,
            o.descripcion,
            o.libroOrigen,
            o.estado,
            i + 1,
            o.transaccionId,
          ),
      ),
    );
  }

  obtenerPorCuentaMensual(): Promise<Observaciones[]> {
    return Promise.resolve([]);
  }
}

const tx = (id: number, depositos: number, retiro: number, saldo: number) =>
  new TransaccionLibroBanco(
    null,
    null,
    `Proveedor ${id}`,
    depositos,
    retiro,
    saldo,
    id,
  );

const libro = (id: number, transacciones: TransaccionLibroBanco[]) =>
  new LibroBanco(7, null, transacciones, id);

describe('AuditarLibroBancoUseCase', () => {
  let repositorio: ObservacionRepositoryFalso;
  let casoDeUso: AuditarLibroBancoUseCase;

  beforeEach(() => {
    repositorio = new ObservacionRepositoryFalso();
    casoDeUso = new AuditarLibroBancoUseCase(
      new MotorAuditoriaService([new LibroBancoV3Rule()]),
      repositorio,
    );
  });

  it('con un libro consistente devuelve VERIFICADO y no persiste nada', async () => {
    const resultados = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 150)]),
    ]);

    expect(repositorio.guardadas).toEqual([[]]);
    expect(resultados).toEqual([
      {
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.VERIFICADO,
        observaciones: [],
      },
    ]);
  });

  it('con una fila incorrecta devuelve FALLO con la observación persistida (con id)', async () => {
    const resultados = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 999)]),
    ]);

    expect(repositorio.guardadas[0]).toHaveLength(1);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].estado).toBe(EstadoValidacion.FALLO);
    expect(resultados[0].observaciones).toHaveLength(1);
    expect(resultados[0].observaciones[0]).toMatchObject({
      id: 1,
      cuentaMensualId: 7,
      codigoRegla: validationsCode.V3,
      transaccionId: 2,
    });
  });

  it('junta los hallazgos de todos los libros del mes en una sola persistencia', async () => {
    const resultados = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 999)]),
      libro(2, [tx(3, 0, 0, 500), tx(4, 0, 100, 1)]),
    ]);

    expect(repositorio.guardadas).toHaveLength(1);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].observaciones.map((o) => o.transaccionId)).toEqual([
      2, 4,
    ]);
  });

  it('sin libros devuelve FALTAN_LIBROS y no persiste observaciones', async () => {
    const resultados = await casoDeUso.execute(7, []);

    expect(resultados).toEqual([
      {
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.FALTAN_LIBROS,
        mensaje: 'Faltan libros requeridos: LIBRO_BANCO',
        observaciones: [],
      },
    ]);
    expect(repositorio.guardadas.flat()).toEqual([]);
  });
});
