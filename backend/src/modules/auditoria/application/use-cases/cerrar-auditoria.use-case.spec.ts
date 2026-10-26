import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { AccesoCuentaService } from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { CuentaMensual } from '../../../cuentas/domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../cuentas/domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { EstadoObservacion } from '../../domain/rules/validations.js';
import {
  EjecucionAuditoriaRepositoryPort,
  type EjecucionGuardada,
} from '../ports/out/ejecucion-auditoria-repository.port.js';
import {
  ObservacionRepositoryPort,
  type CambiosRevision,
  type ConteoObservaciones,
} from '../ports/out/observacion-repository.port.js';
import { CerrarAuditoriaUseCase } from './cerrar-auditoria.use-case.js';

const ID_CUENTA = 5;
const ID_ORGANISMO = 10;
const ID_AUDITOR = 77;
const ID_EJECUCION = 3;

const conteo = (
  abiertas: number,
  confirmadas: number,
  descartadas: number,
): ConteoObservaciones => ({
  [EstadoObservacion.ABIERTA]: abiertas,
  [EstadoObservacion.CONFIRMADA]: confirmadas,
  [EstadoObservacion.DESCARTADA]: descartadas,
});

class EjecucionesFalso extends EjecucionAuditoriaRepositoryPort {
  cierres: {
    ejecucionId: number;
    estadoFinal: string;
    conclusion: string;
    cerradaPorId: number;
  }[] = [];

  constructor(private readonly hayEjecucion: boolean) {
    super();
  }
  guardar(): Promise<EjecucionGuardada> {
    throw new Error('no usado');
  }
  buscarUltima(): Promise<EjecucionAuditoria | null> {
    return Promise.resolve(
      this.hayEjecucion
        ? new EjecucionAuditoria({
            id: ID_EJECUCION,
            cuentaMensualId: ID_CUENTA,
            versionReglas: '1',
            ejecutadaPorId: ID_AUDITOR,
            resultados: [],
          })
        : null,
    );
  }
  buscarPorId(): Promise<EjecucionAuditoria | null> {
    throw new Error('no usado');
  }
  cerrar(
    ejecucionId: number,
    cierre: { cerradaPorId: number; conclusion: string; estadoFinal: string },
  ): Promise<boolean> {
    this.cierres.push({ ejecucionId, ...cierre });
    return Promise.resolve(true);
  }
}

class ObservacionesFalso extends ObservacionRepositoryPort {
  constructor(private readonly cantidades: ConteoObservaciones) {
    super();
  }
  contarPorEstado(): Promise<ConteoObservaciones> {
    return Promise.resolve(this.cantidades);
  }
  buscarPorId(): Promise<Observaciones | null> {
    throw new Error('no usado');
  }
  revisar(_id: number, _cambios: CambiosRevision): Promise<Observaciones> {
    throw new Error('no usado');
  }
  obtenerPorEjecucion(): Promise<Observaciones[]> {
    throw new Error('no usado');
  }
}

class CuentasFalso extends CuentaMensualRepositoryPort {
  cambios: [EstadoCuentaMensual, EstadoCuentaMensual][] = [];
  perderCarrera = false;

  constructor(private readonly estado: EstadoCuentaMensual | null) {
    super();
  }
  existe(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<CuentaMensual | null> {
    return Promise.resolve(
      this.estado ? new CuentaMensual(3, 1, this.estado, ID_CUENTA) : null,
    );
  }
  obtenerOrganismoId(): Promise<number | null> {
    return Promise.resolve(ID_ORGANISMO);
  }
  documentosFaltantes(): Promise<string[]> {
    throw new Error('no usado');
  }
  cambiarEstado(
    _id: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean> {
    this.cambios.push([desde, hacia]);
    return Promise.resolve(!this.perderCarrera);
  }
  presentar(): Promise<boolean> {
    throw new Error('no usado');
  }
  listar(): Promise<CuentaMensualListada[]> {
    throw new Error('no usado');
  }
}

class OrganismosFalso extends OrganismoRepositoryPort {
  crear(): Promise<Organismo> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<Organismo | null> {
    throw new Error('no usado');
  }
  buscarTodos(): Promise<Organismo[]> {
    throw new Error('no usado');
  }
  activar(): Promise<boolean> {
    throw new Error('no usado');
  }
  desactivar(): Promise<boolean> {
    throw new Error('no usado');
  }
  asignarAuditor(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarIdsPorAuditor(): Promise<number[]> {
    throw new Error('no usado');
  }
  esAuditorDelOrganismo(
    auditorId: number,
    organismoId: number,
  ): Promise<boolean> {
    return Promise.resolve(
      auditorId === ID_AUDITOR && organismoId === ID_ORGANISMO,
    );
  }
}

class ActividadEspia extends ContextoActividadPort {
  detalles: Record<string, unknown>[] = [];
  actor(): void {}
  entidad(): void {}
  organismo(): void {}
  cuentaMensual(): void {}
  detalle(datos: Record<string, unknown>): void {
    this.detalles.push(datos);
  }
}

const auditor = { usuarioId: ID_AUDITOR, roles: [Rol.AUDITOR] };

const armar = ({
  estado = EstadoCuentaMensual.EN_AUDITORIA as EstadoCuentaMensual | null,
  cantidades = conteo(0, 1, 2),
  hayEjecucion = true,
} = {}) => {
  const cuentas = new CuentasFalso(estado);
  const ejecuciones = new EjecucionesFalso(hayEjecucion);
  const actividad = new ActividadEspia();
  const casoDeUso = new CerrarAuditoriaUseCase(
    ejecuciones,
    new ObservacionesFalso(cantidades),
    cuentas,
    new AccesoCuentaService(
      new OrganismosFalso(),
      new ResponsableDelOrganismoService(undefined as never),
    ),
    actividad,
  );
  return { cuentas, ejecuciones, actividad, casoDeUso };
};

describe('CerrarAuditoriaUseCase', () => {
  it('con al menos una observación confirmada la rendición queda CON_OBSERVACIONES', async () => {
    const { cuentas, ejecuciones, casoDeUso } = armar({
      cantidades: conteo(0, 2, 1),
    });

    const estadoFinal = await casoDeUso.execute(
      ID_CUENTA,
      '  Se observan diferencias  ',
      auditor,
    );

    expect(estadoFinal).toBe(EstadoCuentaMensual.CON_OBSERVACIONES);
    expect(cuentas.cambios).toEqual([
      [EstadoCuentaMensual.EN_AUDITORIA, EstadoCuentaMensual.CON_OBSERVACIONES],
    ]);
    //la conclusión queda guardada sin espacios sobrantes, con quién cerró
    expect(ejecuciones.cierres).toEqual([
      {
        ejecucionId: ID_EJECUCION,
        estadoFinal: EstadoCuentaMensual.CON_OBSERVACIONES,
        conclusion: 'Se observan diferencias',
        cerradaPorId: ID_AUDITOR,
      },
    ]);
  });

  it('si todas se descartaron la rendición queda AUDITADA', async () => {
    const { cuentas, casoDeUso } = armar({ cantidades: conteo(0, 0, 3) });

    expect(
      await casoDeUso.execute(ID_CUENTA, 'Sin observaciones', auditor),
    ).toBe(EstadoCuentaMensual.AUDITADA);
    expect(cuentas.cambios[0][1]).toBe(EstadoCuentaMensual.AUDITADA);
  });

  it('una auditoría sin ninguna observación también se puede cerrar como AUDITADA', async () => {
    const { casoDeUso } = armar({ cantidades: conteo(0, 0, 0) });

    expect(await casoDeUso.execute(ID_CUENTA, 'Todo en orden', auditor)).toBe(
      EstadoCuentaMensual.AUDITADA,
    );
  });

  it('deja en la bitácora la ejecución, el estado final y cuántas se confirmaron y descartaron', async () => {
    const { actividad, casoDeUso } = armar({ cantidades: conteo(0, 2, 1) });

    await casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor);

    expect(actividad.detalles).toEqual([
      {
        ejecucionId: ID_EJECUCION,
        estadoFinal: EstadoCuentaMensual.CON_OBSERVACIONES,
        confirmadas: 2,
        descartadas: 1,
      },
    ]);
  });

  it.each([
    [
      1,
      'Queda 1 observación sin revisar: confirmala o descartala antes de cerrar.',
    ],
    [
      3,
      'Quedan 3 observaciones sin revisar: confirmalas o descartalas antes de cerrar.',
    ],
  ])(
    '409 si quedan %s observaciones abiertas, sin cambiar nada',
    async (abiertas, mensaje) => {
      const { cuentas, ejecuciones, casoDeUso } = armar({
        cantidades: conteo(abiertas, 1, 0),
      });

      await expect(
        casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor),
      ).rejects.toThrow(new ConflictException(mensaje));
      expect(cuentas.cambios).toEqual([]);
      expect(ejecuciones.cierres).toEqual([]);
    },
  );

  it.each(['', '   '])(
    '400 si la conclusión está vacía (%j)',
    async (conclusion) => {
      const { cuentas, casoDeUso } = armar();

      await expect(
        casoDeUso.execute(ID_CUENTA, conclusion, auditor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(cuentas.cambios).toEqual([]);
    },
  );

  it.each([
    [
      EstadoCuentaMensual.EN_BORRADOR,
      'La auditoría de esta rendición no está en curso.',
    ],
    [
      EstadoCuentaMensual.LISTO_PARA_AUDITAR,
      'La auditoría de esta rendición no está en curso.',
    ],
    [
      EstadoCuentaMensual.AUDITADA,
      'La auditoría de esta rendición ya fue cerrada.',
    ],
    [
      EstadoCuentaMensual.CON_OBSERVACIONES,
      'La auditoría de esta rendición ya fue cerrada.',
    ],
  ])('409 si la rendición está %s', async (estado, mensaje) => {
    const { cuentas, casoDeUso } = armar({ estado });

    await expect(
      casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor),
    ).rejects.toThrow(new ConflictException(mensaje));
    expect(cuentas.cambios).toEqual([]);
  });

  it('409 si otra petición cerró la auditoría primero (el cambio de estado atómico no pasó)', async () => {
    const { cuentas, ejecuciones, casoDeUso } = armar();
    cuentas.perderCarrera = true;

    await expect(
      casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor),
    ).rejects.toThrow(
      new ConflictException('La auditoría de esta rendición ya fue cerrada.'),
    );
    expect(ejecuciones.cierres).toEqual([]);
  });

  it('409 si la rendición no tiene una auditoría ejecutada', async () => {
    const { casoDeUso } = armar({ hayEjecucion: false });

    await expect(
      casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('404 si la cuenta no existe', async () => {
    const { casoDeUso } = armar({ estado: null });

    await expect(
      casoDeUso.execute(ID_CUENTA, 'Conclusión', auditor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 si el auditor no tiene asignado el organismo, antes que cualquier 409', async () => {
    const { cuentas, casoDeUso } = armar({
      estado: EstadoCuentaMensual.AUDITADA,
    });

    await expect(
      casoDeUso.execute(ID_CUENTA, 'Conclusión', {
        usuarioId: 1,
        roles: [Rol.AUDITOR],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(cuentas.cambios).toEqual([]);
  });

  it('un ADMIN puede cerrar cualquier auditoría', async () => {
    const { casoDeUso } = armar({ cantidades: conteo(0, 0, 1) });

    expect(
      await casoDeUso.execute(ID_CUENTA, 'Conclusión', {
        usuarioId: 1,
        roles: [Rol.ADMIN],
      }),
    ).toBe(EstadoCuentaMensual.AUDITADA);
  });
});
