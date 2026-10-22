import { ConflictException, NotFoundException } from '@nestjs/common';
import { CuentaMensual } from '../../../cuentas/domain/entities/cuenta-mensual.domain.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { LibroBancoRepositoryPort } from '../ports/out/libro-banco-repository.port.js';
import { IngestarLibroBancoUseCase } from './ingestar-libro-banco.use-case.js';

class CuentaMensualRepositorioFalso extends CuentaMensualRepositoryPort {
  constructor(private readonly cuenta: CuentaMensual | null) {
    super();
  }

  existe(): Promise<boolean> {
    return Promise.resolve(this.cuenta !== null);
  }
  buscarPorId(): Promise<CuentaMensual | null> {
    return Promise.resolve(this.cuenta);
  }
  obtenerOrganismoId(): Promise<number | null> {
    return Promise.resolve(null);
  }
  cambiarEstado(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listar(): Promise<CuentaMensual[]> {
    return Promise.resolve([]);
  }
}

class LibroBancoRepositorioFalso extends LibroBancoRepositoryPort {
  guardados: LibroBanco[] = [];

  guardar(libroBanco: LibroBanco): Promise<LibroBanco> {
    this.guardados.push(libroBanco);
    return Promise.resolve(libroBanco);
  }
  buscarPorCuentaMensualId(): Promise<LibroBanco[]> {
    return Promise.resolve([]);
  }
}

const comando = {
  transacciones: [
    { aLaOrdenDe: 'Proveedor', depositos: 0, retiro: 10, saldo: 90 },
  ],
};

const armar = (cuenta: CuentaMensual | null) => {
  const libros = new LibroBancoRepositorioFalso();
  const casoDeUso = new IngestarLibroBancoUseCase(
    libros,
    new CuentaMensualRepositorioFalso(cuenta),
  );
  return { libros, casoDeUso };
};

describe('IngestarLibroBancoUseCase', () => {
  it('guarda el libro si la cuenta está en borrador', async () => {
    const { libros, casoDeUso } = armar(
      new CuentaMensual(3, 1, EstadoCuentaMensual.EN_BORRADOR, 5),
    );

    await casoDeUso.execute(5, comando);

    expect(libros.guardados).toHaveLength(1);
    expect(libros.guardados[0].cuentaMensualId).toBe(5);
  });

  it('404 si la cuenta mensual no existe', async () => {
    const { libros, casoDeUso } = armar(null);

    await expect(casoDeUso.execute(5, comando)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(libros.guardados).toEqual([]);
  });

  it.each([
    EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    EstadoCuentaMensual.EN_AUDITORIA,
    EstadoCuentaMensual.AUDITADA,
    EstadoCuentaMensual.CON_OBSERVACIONES,
  ])('409 si la cuenta está en %s, sin guardar nada', async (estado) => {
    const { libros, casoDeUso } = armar(new CuentaMensual(3, 1, estado, 5));

    await expect(casoDeUso.execute(5, comando)).rejects.toThrow(
      new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      ),
    );
    expect(libros.guardados).toEqual([]);
  });
});
