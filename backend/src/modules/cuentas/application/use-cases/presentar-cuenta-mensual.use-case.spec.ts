import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Responsable } from '../../../responsables/domain/entities/responsable.domain.js';
import { ResponsableRepositoryPort } from '../../../responsables/application/ports/out/responsable-repository.port.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../services/responsable-del-organismo.service.js';
import { PresentarCuentaMensualUseCase } from './presentar-cuenta-mensual.use-case.js';

const ID_CUENTA = 5;
const ID_ORGANISMO = 10;
const ID_USUARIO = 77;

//repositorio en memoria con una sola cuenta; registra los cambios de estado pedidos
class CuentaMensualRepositorioFalso extends CuentaMensualRepositoryPort {
  cambios: [EstadoCuentaMensual, EstadoCuentaMensual][] = [];
  //simula que otra presentación se coló entre la lectura y el update
  perderCarrera = false;
  //documentos obligatorios que le faltan a la cuenta
  faltantes: string[] = [];

  constructor(
    public cuenta: CuentaMensual | null,
    private readonly organismoId: number | null = ID_ORGANISMO,
  ) {
    super();
  }

  existe(): Promise<boolean> {
    return Promise.resolve(this.cuenta !== null);
  }

  buscarPorId(): Promise<CuentaMensual | null> {
    return Promise.resolve(this.cuenta);
  }

  obtenerOrganismoId(): Promise<number | null> {
    return Promise.resolve(this.organismoId);
  }

  documentosFaltantes(): Promise<string[]> {
    return Promise.resolve(this.faltantes);
  }

  cambiarEstado(
    _id: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean> {
    this.cambios.push([desde, hacia]);
    if (this.perderCarrera) return Promise.resolve(false);
    this.cuenta = new CuentaMensual(
      this.cuenta!.mes,
      this.cuenta!.cuentaAnualId,
      hacia,
      this.cuenta!.id,
    );
    return Promise.resolve(true);
  }

  //el caso de uso de presentar no lista cuentas
  listar(): Promise<CuentaMensualListada[]> {
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

const cuentaEn = (estado: EstadoCuentaMensual) =>
  new CuentaMensual(3, 1, estado, ID_CUENTA, new Date());

const responsable = (organismoId: number | null, active = true) =>
  new Responsable(ID_USUARIO, organismoId, active, 1);

const armar = (
  cuenta: CuentaMensual | null,
  resp: Responsable | null,
  organismoDeLaCuenta: number | null = ID_ORGANISMO,
) => {
  const cuentas = new CuentaMensualRepositorioFalso(
    cuenta,
    organismoDeLaCuenta,
  );
  const casoDeUso = new PresentarCuentaMensualUseCase(
    cuentas,
    new ResponsableDelOrganismoService(new ResponsableRepositorioFalso(resp)),
  );
  return { cuentas, casoDeUso };
};

describe('PresentarCuentaMensualUseCase', () => {
  it('presenta una cuenta en borrador del organismo del responsable', async () => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.EN_BORRADOR),
      responsable(ID_ORGANISMO),
    );

    const resultado = await casoDeUso.execute(ID_CUENTA, ID_USUARIO);

    expect(resultado.estado).toBe(EstadoCuentaMensual.LISTO_PARA_AUDITAR);
    expect(cuentas.cambios).toEqual([
      [EstadoCuentaMensual.EN_BORRADOR, EstadoCuentaMensual.LISTO_PARA_AUDITAR],
    ]);
  });

  it('404 si la cuenta no existe, sin cambiar nada', async () => {
    const { cuentas, casoDeUso } = armar(null, responsable(ID_ORGANISMO));

    await expect(
      casoDeUso.execute(ID_CUENTA, ID_USUARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cuentas.cambios).toEqual([]);
  });

  it.each([
    ['el usuario no tiene responsable', null],
    ['el responsable está inactivo', responsable(ID_ORGANISMO, false)],
    ['el responsable no tiene organismo', responsable(null)],
    ['el responsable es de otro organismo', responsable(ID_ORGANISMO + 1)],
  ])('403 si %s, sin cambiar nada', async (_caso, resp) => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.EN_BORRADOR),
      resp,
    );

    await expect(
      casoDeUso.execute(ID_CUENTA, ID_USUARIO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(cuentas.cambios).toEqual([]);
  });

  it('403 antes que 409: a un ajeno no se le revela el estado de la cuenta', async () => {
    const { casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.AUDITADA),
      responsable(ID_ORGANISMO + 1),
    );

    await expect(
      casoDeUso.execute(ID_CUENTA, ID_USUARIO),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    EstadoCuentaMensual.EN_AUDITORIA,
    EstadoCuentaMensual.AUDITADA,
    EstadoCuentaMensual.CON_OBSERVACIONES,
  ])('409 si la cuenta ya está en %s, sin cambiar nada', async (estado) => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(estado),
      responsable(ID_ORGANISMO),
    );

    await expect(casoDeUso.execute(ID_CUENTA, ID_USUARIO)).rejects.toThrow(
      new ConflictException('La cuenta ya fue presentada'),
    );
    expect(cuentas.cambios).toEqual([]);
  });

  it('409 si falta algún documento obligatorio, sin cambiar nada', async () => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.EN_BORRADOR),
      responsable(ID_ORGANISMO),
    );
    cuentas.faltantes = ['Ingresos y Egresos'];

    await expect(casoDeUso.execute(ID_CUENTA, ID_USUARIO)).rejects.toThrow(
      new ConflictException(
        'Faltan documentos para presentar la rendición: Ingresos y Egresos.',
      ),
    );
    expect(cuentas.cambios).toEqual([]);
  });

  it('409 que nombra todos los documentos si no hay ninguno cargado', async () => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.EN_BORRADOR),
      responsable(ID_ORGANISMO),
    );
    cuentas.faltantes = ['Libro Banco', 'Ingresos y Egresos'];

    await expect(casoDeUso.execute(ID_CUENTA, ID_USUARIO)).rejects.toThrow(
      new ConflictException(
        'Faltan documentos para presentar la rendición: Libro Banco, Ingresos y Egresos.',
      ),
    );
  });

  it('el 409 por ya presentada va antes que el de documentos faltantes', async () => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.LISTO_PARA_AUDITAR),
      responsable(ID_ORGANISMO),
    );
    cuentas.faltantes = ['Libro Banco'];

    await expect(casoDeUso.execute(ID_CUENTA, ID_USUARIO)).rejects.toThrow(
      new ConflictException('La cuenta ya fue presentada'),
    );
  });

  it('409 si otra presentación ganó la carrera (el update atómico no cambió nada)', async () => {
    const { cuentas, casoDeUso } = armar(
      cuentaEn(EstadoCuentaMensual.EN_BORRADOR),
      responsable(ID_ORGANISMO),
    );
    cuentas.perderCarrera = true;

    await expect(casoDeUso.execute(ID_CUENTA, ID_USUARIO)).rejects.toThrow(
      new ConflictException('La cuenta ya fue presentada'),
    );
  });
});
