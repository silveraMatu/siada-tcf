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
import { Raci } from '../../domain/entities/raci.domain.js';
import { TransaccionRaci } from '../../domain/entities/transaccion-raci.domain.js';
import { RaciDuplicadoError } from '../../domain/errors/raci-duplicado.error.js';
import { RaciRepositoryPort } from '../ports/out/raci-repository.port.js';
import {
  CODIGO_LIBRO_DUPLICADO,
  IngestarRaciUseCase,
  type TransaccionRaciComando,
} from './ingestar-raci.use-case.js';
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
  obtenerEjercicioFiscal(): Promise<number | null> {
    return Promise.resolve(2026);
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

//libro en memoria; `reemplazos` registra qué libro se reemplazó y por cuál
class RaciRepositorioFalso extends RaciRepositoryPort {
  guardados: Raci[] = [];
  reemplazos: { idExistente: number; nuevo: Raci }[] = [];
  //simula que otra carga se coló entre la búsqueda y el insert
  carreraConLibro: Raci | null = null;

  constructor(public existente: Raci | null = null) {
    super();
  }

  guardar(libro: Raci): Promise<Raci> {
    if (this.carreraConLibro) {
      this.existente = this.carreraConLibro;
      return Promise.reject(new RaciDuplicadoError(libro.cuentaMensualId));
    }
    this.guardados.push(libro);
    return Promise.resolve(libro);
  }
  buscarPorCuentaMensualId(): Promise<Raci | null> {
    return Promise.resolve(this.existente);
  }
  reemplazar(idExistente: number, nuevo: Raci): Promise<Raci> {
    this.reemplazos.push({ idExistente, nuevo });
    return Promise.resolve(nuevo);
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

const asiento = (
  extra: Partial<TransaccionRaciComando> = {},
): TransaccionRaciComando => ({
  asiento: 1,
  fecha: '2026-03-05',
  concepto: 'Compra de insumos',
  compromisoDelMes: 100,
  compromisoAcumulado: 100,
  devengadoDelMes: 100,
  devengadoAcumulado: 100,
  devengadoSaldo: 0,
  pagoDelMes: 100,
  pagoAcumulado: 100,
  pagoSaldoAPagar: 0,
  ...extra,
});

const comando = { transacciones: [asiento()] };

//libro ya cargado con 2 asientos
const libroExistente = (id = 40) =>
  new Raci(
    ID_CUENTA,
    [1, 2].map(
      (n) =>
        new TransaccionRaci({
          ...asiento({ asiento: n }),
          expediente: null,
          compromisoInstrumentoLegal: null,
          compromisoOrdenProvision: null,
          devengadoOrdenPago: null,
          pagoNumeroCheque: null,
          id: n,
        }),
    ),
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
    existente = null as Raci | null,
    resp = responsable(ID_ORGANISMO) as Responsable | null,
  } = {},
) => {
  const libros = new RaciRepositorioFalso(existente);
  const casoDeUso = new IngestarRaciUseCase(
    libros,
    new CuentaMensualRepositorioFalso(cuenta),
    new ResponsableDelOrganismoService(new ResponsableRepositorioFalso(resp)),
    new ContextoActividadNulo(),
  );
  return { libros, casoDeUso };
};

describe('IngestarRaciUseCase', () => {
  it('guarda el libro si la cuenta está en borrador', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);

    expect(libros.guardados).toHaveLength(1);
    expect(libros.guardados[0].cuentaMensualId).toBe(ID_CUENTA);
    expect(libros.reemplazos).toEqual([]);
  });

  it('guarda quién lo subió y el hash de su contenido', async () => {
    const { libros, casoDeUso } = armar(enBorrador);
    const otroImporte = {
      ...comando,
      transacciones: [asiento({ pagoDelMes: 101 })],
    };

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);
    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);
    await casoDeUso.execute(ID_CUENTA, otroImporte, ID_USUARIO);

    const [primero, repetido, distinto] = libros.guardados;
    expect(primero.subidoPorId).toBe(ID_USUARIO);
    expect(primero.hashContenido).toMatch(/^[0-9a-f]{64}$/);
    expect(repetido.hashContenido).toBe(primero.hashContenido);
    expect(distinto.hashContenido).not.toBe(primero.hashContenido);
  });

  it('mapea todos los campos del asiento al dominio', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(
      ID_CUENTA,
      {
        transacciones: [
          asiento({
            asiento: 7,
            expediente: 'EXP-123/2026',
            compromisoInstrumentoLegal: 'Decreto 12/2026',
            compromisoOrdenProvision: 'OP-4',
            devengadoOrdenPago: 'ORD-9',
            pagoNumeroCheque: 'CH-1',
            compromisoAcumulado: 250.5,
            devengadoSaldo: -3.25,
          }),
        ],
      },
      ID_USUARIO,
    );

    expect(libros.guardados[0].transacciones[0]).toMatchObject({
      asiento: 7,
      fecha: '2026-03-05',
      expediente: 'EXP-123/2026',
      concepto: 'Compra de insumos',
      compromisoInstrumentoLegal: 'Decreto 12/2026',
      compromisoDelMes: 100,
      compromisoAcumulado: 250.5,
      compromisoOrdenProvision: 'OP-4',
      devengadoDelMes: 100,
      devengadoAcumulado: 100,
      devengadoSaldo: -3.25,
      devengadoOrdenPago: 'ORD-9',
      pagoNumeroCheque: 'CH-1',
      pagoDelMes: 100,
      pagoAcumulado: 100,
      pagoSaldoAPagar: 0,
    });
  });

  it('los textos opcionales ausentes o en blanco se guardan como null', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(
      ID_CUENTA,
      {
        transacciones: [asiento({ expediente: '', pagoNumeroCheque: '   ' })],
      },
      ID_USUARIO,
    );

    expect(libros.guardados[0].transacciones[0]).toMatchObject({
      expediente: null,
      compromisoInstrumentoLegal: null,
      compromisoOrdenProvision: null,
      devengadoOrdenPago: null,
      pagoNumeroCheque: null,
    });
  });

  describe('la rendición ya tiene su libro', () => {
    it('409 LIBRO_DUPLICADO con los datos del libro existente, sin guardar nada', async () => {
      const { libros, casoDeUso } = armar(enBorrador, {
        existente: libroExistente(),
      });

      const error = await casoDeUso
        .execute(ID_CUENTA, comando, ID_USUARIO)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        statusCode: 409,
        codigo: CODIGO_LIBRO_DUPLICADO,
        message: 'Ya existe un libro RACI en esta rendición.',
        libroExistente: {
          id: 40,
          numeroCuentaCte: null,
          fechaCreacion: '2026-10-15T12:00:00.000Z',
          cantidadTransacciones: 2,
        },
      });
      expect(libros.guardados).toEqual([]);
      expect(libros.reemplazos).toEqual([]);
    });

    it('con reemplazar=true reemplaza el libro existente', async () => {
      const { libros, casoDeUso } = armar(enBorrador, {
        existente: libroExistente(40),
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

  it('si otra carga gana la carrera responde el mismo 409 LIBRO_DUPLICADO', async () => {
    const { libros, casoDeUso } = armar(enBorrador);
    libros.carreraConLibro = libroExistente(41);

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
    expect(libros.reemplazos).toEqual([]);
  });
});
