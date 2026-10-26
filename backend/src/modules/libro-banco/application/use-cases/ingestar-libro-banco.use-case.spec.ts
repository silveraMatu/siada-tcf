import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Responsable } from '../../../responsables/domain/entities/responsable.domain.js';
import { ResponsableRepositoryPort } from '../../../responsables/application/ports/out/responsable-repository.port.js';
import { CuentaMensual } from '../../../cuentas/domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../cuentas/domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../domain/entities/transaccion-libro-banco.domain.js';
import { LibroBancoDuplicadoError } from '../../domain/errors/libro-banco-duplicado.error.js';
import { LibroBancoRepositoryPort } from '../ports/out/libro-banco-repository.port.js';
import {
  CODIGO_LIBRO_DUPLICADO,
  IngestarLibroBancoUseCase,
} from './ingestar-libro-banco.use-case.js';
import { ContextoActividadNulo } from '../../../registro-actividad/application/services/contexto-actividad-nulo.js';

const ID_CUENTA = 5;
const ID_ORGANISMO = 10;
const ID_USUARIO = 77;

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
    return Promise.resolve(ID_ORGANISMO);
  }
  documentosFaltantes(): Promise<string[]> {
    return Promise.resolve([]);
  }
  presentar(): Promise<boolean> {
    return Promise.resolve(false);
  }
  cambiarEstado(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listar(): Promise<CuentaMensualListada[]> {
    return Promise.resolve([]);
  }
}

//libros en memoria; `reemplazos` registra qué libro se reemplazó y por cuál
class LibroBancoRepositorioFalso extends LibroBancoRepositoryPort {
  guardados: LibroBanco[] = [];
  reemplazos: { idExistente: number; nuevo: LibroBanco }[] = [];
  //simula que otra carga del mismo N° se coló entre la búsqueda y el insert
  carreraConLibro: LibroBanco | null = null;

  constructor(public existentes: LibroBanco[] = []) {
    super();
  }

  guardar(libroBanco: LibroBanco): Promise<LibroBanco> {
    if (this.carreraConLibro) {
      this.existentes.push(this.carreraConLibro);
      return Promise.reject(
        new LibroBancoDuplicadoError(
          libroBanco.cuentaMensualId,
          libroBanco.numeroCuentaCte!,
        ),
      );
    }
    this.guardados.push(libroBanco);
    return Promise.resolve(libroBanco);
  }
  buscarPorCuentaYNumero(
    cuentaMensualId: number,
    numeroCuentaCte: string,
  ): Promise<LibroBanco | null> {
    return Promise.resolve(
      this.existentes.find(
        (l) =>
          l.cuentaMensualId === cuentaMensualId &&
          l.numeroCuentaCte === numeroCuentaCte,
      ) ?? null,
    );
  }
  reemplazar(idExistente: number, nuevo: LibroBanco): Promise<LibroBanco> {
    this.reemplazos.push({ idExistente, nuevo });
    return Promise.resolve(nuevo);
  }
  buscarPorCuentaMensualId(): Promise<LibroBanco[]> {
    return Promise.resolve([]);
  }
}

class ResponsableRepositorioFalso extends ResponsableRepositoryPort {
  constructor(private readonly responsable: Responsable | null) {
    super();
  }

  buscarPorUsuarioId(): Promise<Responsable | null> {
    return Promise.resolve(this.responsable);
  }
  crear(): Promise<Responsable> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<Responsable | null> {
    throw new Error('no usado');
  }
  actualizar(): Promise<Responsable> {
    throw new Error('no usado');
  }
  listar(): Promise<Responsable[]> {
    throw new Error('no usado');
  }
  buscarPorOrganismo(): Promise<Responsable[]> {
    throw new Error('no usado');
  }
}

const responsable = (organismoId: number | null, active = true) =>
  new Responsable(ID_USUARIO, organismoId, active, 1);

const comando = {
  numeroCuentaCte: '100234/1',
  transacciones: [
    { aLaOrdenDe: 'Proveedor', depositos: 0, retiro: 10, saldo: 90 },
  ],
};

//libro ya cargado con 2 transacciones
const libroExistente = (numeroCuentaCte: string, id = 40) =>
  new LibroBanco(
    ID_CUENTA,
    numeroCuentaCte,
    [
      new TransaccionLibroBanco(null, null, 'A', 0, 1, 99, 1),
      new TransaccionLibroBanco(null, null, 'B', 0, 1, 98, 2),
    ],
    id,
    new Date('2026-10-15T12:00:00.000Z'),
  );

const enBorrador = new CuentaMensual(
  3,
  1,
  EstadoCuentaMensual.EN_BORRADOR,
  ID_CUENTA,
);

const armar = (
  cuenta: CuentaMensual | null,
  {
    existentes = [] as LibroBanco[],
    resp = responsable(ID_ORGANISMO) as Responsable | null,
  } = {},
) => {
  const libros = new LibroBancoRepositorioFalso(existentes);
  const casoDeUso = new IngestarLibroBancoUseCase(
    libros,
    new CuentaMensualRepositorioFalso(cuenta),
    new ResponsableDelOrganismoService(new ResponsableRepositorioFalso(resp)),
    new ContextoActividadNulo(),
  );
  return { libros, casoDeUso };
};

describe('IngestarLibroBancoUseCase', () => {
  it('guarda el libro si la cuenta está en borrador', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);

    expect(libros.guardados).toHaveLength(1);
    expect(libros.guardados[0].cuentaMensualId).toBe(ID_CUENTA);
    expect(libros.guardados[0].numeroCuentaCte).toBe('100234/1');
    expect(libros.reemplazos).toEqual([]);
  });

  it('guarda quién lo subió y el hash de su contenido', async () => {
    const { libros, casoDeUso } = armar(enBorrador);
    const otroSaldo = {
      ...comando,
      transacciones: [{ ...comando.transacciones[0], saldo: 91 }],
    };

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);
    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);
    await casoDeUso.execute(ID_CUENTA, otroSaldo, ID_USUARIO);

    const [primero, repetido, distinto] = libros.guardados;
    expect(primero.subidoPorId).toBe(ID_USUARIO);
    expect(primero.hashContenido).toMatch(/^[0-9a-f]{64}$/);
    //mismo contenido, mismo hash; otro dato, otro hash
    expect(repetido.hashContenido).toBe(primero.hashContenido);
    expect(distinto.hashContenido).not.toBe(primero.hashContenido);
  });

  it('un libro con otro N° de cuenta se suma a los ya cargados', async () => {
    const { libros, casoDeUso } = armar(enBorrador, {
      existentes: [libroExistente('999/9')],
    });

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);

    expect(libros.guardados).toHaveLength(1);
    expect(libros.reemplazos).toEqual([]);
  });

  describe('mismo N° de cuenta que un libro ya cargado', () => {
    it('409 LIBRO_DUPLICADO con los datos del libro existente, sin guardar nada', async () => {
      const { libros, casoDeUso } = armar(enBorrador, {
        existentes: [libroExistente('100234/1')],
      });

      const error = await casoDeUso
        .execute(ID_CUENTA, comando, ID_USUARIO)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        statusCode: 409,
        codigo: CODIGO_LIBRO_DUPLICADO,
        message:
          'Ya existe un libro para la cuenta corriente 100234/1 en esta rendición.',
        libroExistente: {
          id: 40,
          numeroCuentaCte: '100234/1',
          fechaCreacion: '2026-10-15T12:00:00.000Z',
          cantidadTransacciones: 2,
        },
      });
      expect(libros.guardados).toEqual([]);
      expect(libros.reemplazos).toEqual([]);
    });

    it('con reemplazar=true reemplaza el libro existente', async () => {
      const { libros, casoDeUso } = armar(enBorrador, {
        existentes: [libroExistente('100234/1', 40)],
      });

      await casoDeUso.execute(
        ID_CUENTA,
        { ...comando, reemplazar: true },
        ID_USUARIO,
      );

      expect(libros.reemplazos).toHaveLength(1);
      expect(libros.reemplazos[0].idExistente).toBe(40);
      expect(libros.reemplazos[0].nuevo.transacciones).toHaveLength(1);
      expect(libros.guardados).toEqual([]);
    });

    it('con reemplazar=true y sin libro existente guarda uno nuevo', async () => {
      const { libros, casoDeUso } = armar(enBorrador);

      await casoDeUso.execute(
        ID_CUENTA,
        { ...comando, reemplazar: true },
        ID_USUARIO,
      );

      expect(libros.guardados).toHaveLength(1);
      expect(libros.reemplazos).toEqual([]);
    });
  });

  it('si otra carga del mismo N° gana la carrera responde el mismo 409 LIBRO_DUPLICADO', async () => {
    const { libros, casoDeUso } = armar(enBorrador);
    libros.carreraConLibro = libroExistente('100234/1', 41);

    const error = await casoDeUso
      .execute(ID_CUENTA, comando, ID_USUARIO)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      codigo: CODIGO_LIBRO_DUPLICADO,
      libroExistente: { id: 41, cantidadTransacciones: 2 },
    });
  });

  it('404 si la cuenta mensual no existe', async () => {
    const { libros, casoDeUso } = armar(null);

    await expect(
      casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(libros.guardados).toEqual([]);
  });

  it.each([
    ['el usuario no tiene responsable', null],
    ['el responsable está inactivo', responsable(ID_ORGANISMO, false)],
    ['el responsable no tiene organismo', responsable(null)],
    ['el responsable es de otro organismo', responsable(ID_ORGANISMO + 1)],
  ])('403 si %s, sin guardar nada', async (_caso, resp) => {
    const { libros, casoDeUso } = armar(enBorrador, { resp });

    await expect(
      casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(libros.guardados).toEqual([]);
  });

  it('403 antes que 409: a un ajeno no se le revela el estado de la cuenta', async () => {
    const { casoDeUso } = armar(
      new CuentaMensual(3, 1, EstadoCuentaMensual.AUDITADA, ID_CUENTA),
      { resp: responsable(ID_ORGANISMO + 1) },
    );

    await expect(
      casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    EstadoCuentaMensual.EN_AUDITORIA,
    EstadoCuentaMensual.AUDITADA,
    EstadoCuentaMensual.CON_OBSERVACIONES,
  ])('409 si la cuenta está en %s, sin guardar nada', async (estado) => {
    const { libros, casoDeUso } = armar(
      new CuentaMensual(3, 1, estado, ID_CUENTA),
    );

    await expect(
      casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO),
    ).rejects.toThrow(
      new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      ),
    );
    expect(libros.guardados).toEqual([]);
  });
});
