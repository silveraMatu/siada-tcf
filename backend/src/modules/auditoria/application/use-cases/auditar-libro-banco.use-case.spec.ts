import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { validationsCode } from '../../domain/rules/validations.js';
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
    casoDeUso = new AuditarLibroBancoUseCase(repositorio);
  });

  it('con un libro consistente guarda una lista vacía', async () => {
    const resultado = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 150)]),
    ]);

    expect(repositorio.guardadas).toEqual([[]]);
    expect(resultado).toEqual([]);
  });

  it('con una fila incorrecta persiste la observación de esa cuenta y transacción', async () => {
    const resultado = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 999)]),
    ]);

    expect(repositorio.guardadas[0]).toHaveLength(1);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: 1,
      cuentaMensualId: 7,
      codigoRegla: validationsCode.V3,
      transaccionId: 2,
    });
  });

  it('junta los hallazgos de todos los libros del mes en una sola persistencia', async () => {
    const resultado = await casoDeUso.execute(7, [
      libro(1, [tx(1, 100, 0, 100), tx(2, 50, 0, 999)]),
      libro(2, [tx(3, 0, 0, 500), tx(4, 0, 100, 1)]),
    ]);

    expect(repositorio.guardadas).toHaveLength(1);
    expect(resultado.map((o) => o.transaccionId)).toEqual([2, 4]);
  });
});
