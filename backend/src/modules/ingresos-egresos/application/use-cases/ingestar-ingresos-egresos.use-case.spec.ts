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
import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../domain/entities/transaccion-ingreso-egreso.domain.js';
import { IngresosEgresosDuplicadoError } from '../../domain/errors/ingresos-egresos-duplicado.error.js';
import { IngresosEgresosRepositoryPort } from '../ports/out/ingresos-egresos-repository.port.js';
import {
  CODIGO_LIBRO_DUPLICADO,
  IngestarIngresosEgresosUseCase,
  type TransaccionIngresoEgresoComando,
} from './ingestar-ingresos-egresos.use-case.js';

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
  cambiarEstado(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listar(): Promise<CuentaMensualListada[]> {
    return Promise.resolve([]);
  }
}

//libro en memoria; `reemplazos` registra qué libro se reemplazó y por cuál
class IngresosEgresosRepositorioFalso extends IngresosEgresosRepositoryPort {
  guardados: IngresosEgresos[] = [];
  reemplazos: { idExistente: number; nuevo: IngresosEgresos }[] = [];
  //simula que otra carga se coló entre la búsqueda y el insert
  carreraConLibro: IngresosEgresos | null = null;

  constructor(public existente: IngresosEgresos | null = null) {
    super();
  }

  guardar(libro: IngresosEgresos): Promise<IngresosEgresos> {
    if (this.carreraConLibro) {
      this.existente = this.carreraConLibro;
      return Promise.reject(
        new IngresosEgresosDuplicadoError(libro.cuentaMensualId),
      );
    }
    this.guardados.push(libro);
    return Promise.resolve(libro);
  }
  buscarPorCuentaMensualId(): Promise<IngresosEgresos | null> {
    return Promise.resolve(this.existente);
  }
  reemplazar(
    idExistente: number,
    nuevo: IngresosEgresos,
  ): Promise<IngresosEgresos> {
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

const fila = (
  extra: Partial<TransaccionIngresoEgresoComando> = {},
): TransaccionIngresoEgresoComando => ({
  fila: 1,
  fecha: '2026-03-05',
  concepto: 'Cobro de tasas',
  cajaDebe: 0,
  cajaHaber: 0,
  cajaSaldo: 0,
  bancoDebe: 100,
  bancoHaber: 0,
  bancoSaldo: 100,
  egresoInc1: 0,
  egresoInc2: 0,
  egresoInc3: 0,
  egresoInc4: 0,
  egresoInc5: 0,
  ingresoMunicipal: 100,
  ingresoOtras: 0,
  cuentasVariasDebe: 0,
  cuentasVariasHaber: 0,
  ...extra,
});

const comando = { numeroCuentaCte: '100234/1', transacciones: [fila()] };

//libro ya cargado con 2 transacciones
const libroExistente = (id = 40) =>
  new IngresosEgresos(
    ID_CUENTA,
    '100234/1',
    [1, 2].map(
      (n) =>
        new TransaccionIngresoEgreso({
          ...fila({ fila: n }),
          cheque: null,
          comprobante: null,
          cuentasVariasConcepto: null,
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
    existente = null as IngresosEgresos | null,
    resp = responsable(ID_ORGANISMO) as Responsable | null,
  } = {},
) => {
  const libros = new IngresosEgresosRepositorioFalso(existente);
  const casoDeUso = new IngestarIngresosEgresosUseCase(
    libros,
    new CuentaMensualRepositorioFalso(cuenta),
    new ResponsableDelOrganismoService(new ResponsableRepositorioFalso(resp)),
  );
  return { libros, casoDeUso };
};

describe('IngestarIngresosEgresosUseCase', () => {
  it('guarda el libro si la cuenta está en borrador', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(ID_CUENTA, comando, ID_USUARIO);

    expect(libros.guardados).toHaveLength(1);
    expect(libros.guardados[0].cuentaMensualId).toBe(ID_CUENTA);
    expect(libros.guardados[0].numeroCuentaCte).toBe('100234/1');
    expect(libros.reemplazos).toEqual([]);
  });

  it('mapea todos los campos de la fila al dominio', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(
      ID_CUENTA,
      {
        transacciones: [
          fila({
            fila: 7,
            cheque: 'CH-1',
            comprobante: 'C-9',
            cajaSaldo: -5.5,
            egresoInc3: 12.5,
            ingresoOtras: 3,
            cuentasVariasConcepto: 'Retenciones',
            cuentasVariasHaber: 8,
          }),
        ],
      },
      ID_USUARIO,
    );

    expect(libros.guardados[0].transacciones[0]).toMatchObject({
      fila: 7,
      fecha: '2026-03-05',
      concepto: 'Cobro de tasas',
      cheque: 'CH-1',
      comprobante: 'C-9',
      cajaSaldo: -5.5,
      bancoDebe: 100,
      egresoInc3: 12.5,
      ingresoMunicipal: 100,
      ingresoOtras: 3,
      cuentasVariasConcepto: 'Retenciones',
      cuentasVariasHaber: 8,
    });
  });

  it('los textos opcionales ausentes o en blanco se guardan como null', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(
      ID_CUENTA,
      {
        numeroCuentaCte: '  ',
        transacciones: [fila({ cheque: '', comprobante: '   ' })],
      },
      ID_USUARIO,
    );

    expect(libros.guardados[0].numeroCuentaCte).toBeNull();
    expect(libros.guardados[0].transacciones[0]).toMatchObject({
      cheque: null,
      comprobante: null,
      cuentasVariasConcepto: null,
    });
  });

  it('el N° de cuenta corriente es opcional', async () => {
    const { libros, casoDeUso } = armar(enBorrador);

    await casoDeUso.execute(
      ID_CUENTA,
      { transacciones: comando.transacciones },
      ID_USUARIO,
    );

    expect(libros.guardados[0].numeroCuentaCte).toBeNull();
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
        message: 'Ya existe un libro de ingresos y egresos en esta rendición.',
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
