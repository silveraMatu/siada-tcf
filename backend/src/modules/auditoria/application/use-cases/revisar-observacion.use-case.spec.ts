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
import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../../domain/rules/validations.js';
import {
  EjecucionAuditoriaRepositoryPort,
  type EjecucionGuardada,
} from '../ports/out/ejecucion-auditoria-repository.port.js';
import {
  ObservacionRepositoryPort,
  type CambiosRevision,
  type ConteoObservaciones,
} from '../ports/out/observacion-repository.port.js';
import { RevisarObservacionUseCase } from './revisar-observacion.use-case.js';

const ID_CUENTA = 5;
const ID_ORGANISMO = 10;
const ID_AUDITOR = 77;
const ID_EJECUCION = 3;

const observacion = (
  ejecucionId = ID_EJECUCION,
  estado = EstadoObservacion.ABIERTA,
) =>
  new Observaciones({
    id: 40,
    ejecucionId,
    cuentaMensualId: ID_CUENTA,
    codigoRegla: validationsCode.V3,
    tipo: validationsType.INTERNA,
    descripcion: 'x',
    libroOrigen: LibroOrigen.LIBRO_BANCO,
    estado,
  });

class ObservacionesFalso extends ObservacionRepositoryPort {
  revisiones: CambiosRevision[] = [];

  constructor(private readonly observacion: Observaciones | null) {
    super();
  }
  buscarPorId(): Promise<Observaciones | null> {
    return Promise.resolve(this.observacion);
  }
  revisar(_id: number, cambios: CambiosRevision): Promise<Observaciones> {
    this.revisiones.push(cambios);
    const o = this.observacion!;
    return Promise.resolve(
      new Observaciones({
        cuentaMensualId: o.cuentaMensualId,
        codigoRegla: o.codigoRegla,
        tipo: o.tipo,
        descripcion: o.descripcion,
        libroOrigen: o.libroOrigen,
        estado: cambios.estado,
        id: o.id,
        ejecucionId: o.ejecucionId,
        motivoDescarte: cambios.motivoDescarte ?? undefined,
        revisadaPorId: cambios.revisadaPorId ?? undefined,
        revisadaEn: cambios.revisadaEn ?? undefined,
      }),
    );
  }
  obtenerPorEjecucion(): Promise<Observaciones[]> {
    throw new Error('no usado');
  }
  contarPorEstado(): Promise<ConteoObservaciones> {
    throw new Error('no usado');
  }
}

class EjecucionesFalso extends EjecucionAuditoriaRepositoryPort {
  constructor(private readonly ultimaId: number | null) {
    super();
  }
  guardar(): Promise<EjecucionGuardada> {
    throw new Error('no usado');
  }
  buscarUltima(): Promise<EjecucionAuditoria | null> {
    return Promise.resolve(
      this.ultimaId === null
        ? null
        : new EjecucionAuditoria({
            id: this.ultimaId,
            cuentaMensualId: ID_CUENTA,
            versionReglas: '1',
            ejecutadaPorId: ID_AUDITOR,
            resultados: [],
          }),
    );
  }
  buscarPorId(): Promise<EjecucionAuditoria | null> {
    throw new Error('no usado');
  }
  cerrar(): Promise<boolean> {
    throw new Error('no usado');
  }
}

class CuentasFalso extends CuentaMensualRepositoryPort {
  constructor(private readonly estado: EstadoCuentaMensual) {
    super();
  }
  existe(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<CuentaMensual | null> {
    return Promise.resolve(new CuentaMensual(3, 1, this.estado, ID_CUENTA));
  }
  obtenerOrganismoId(): Promise<number | null> {
    return Promise.resolve(ID_ORGANISMO);
  }
  documentosFaltantes(): Promise<string[]> {
    throw new Error('no usado');
  }
  cambiarEstado(): Promise<boolean> {
    throw new Error('no usado');
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
  cuentas: number[] = [];
  actor(): void {}
  entidad(): void {}
  organismo(): void {}
  cuentaMensual(id: number): void {
    this.cuentas.push(id);
  }
  detalle(datos: Record<string, unknown>): void {
    this.detalles.push(datos);
  }
}

const auditor = { usuarioId: ID_AUDITOR, roles: [Rol.AUDITOR] };

const armar = ({
  observacionInicial = observacion() as Observaciones | null,
  estado = EstadoCuentaMensual.EN_AUDITORIA,
  ultimaEjecucionId = ID_EJECUCION as number | null,
} = {}) => {
  const observaciones = new ObservacionesFalso(observacionInicial);
  const actividad = new ActividadEspia();
  const casoDeUso = new RevisarObservacionUseCase(
    observaciones,
    new EjecucionesFalso(ultimaEjecucionId),
    new CuentasFalso(estado),
    new AccesoCuentaService(
      new OrganismosFalso(),
      new ResponsableDelOrganismoService(undefined as never),
    ),
    actividad,
  );
  return { observaciones, actividad, casoDeUso };
};

describe('RevisarObservacionUseCase', () => {
  it('CONFIRMAR deja la observación CONFIRMADA con quién y cuándo', async () => {
    const { observaciones, casoDeUso } = armar();

    const resultado = await casoDeUso.execute(
      40,
      { decision: 'CONFIRMAR' },
      auditor,
    );

    expect(resultado.estado).toBe(EstadoObservacion.CONFIRMADA);
    expect(observaciones.revisiones).toHaveLength(1);
    expect(observaciones.revisiones[0]).toMatchObject({
      estado: EstadoObservacion.CONFIRMADA,
      motivoDescarte: null,
      revisadaPorId: ID_AUDITOR,
    });
    expect(observaciones.revisiones[0].revisadaEn).toBeInstanceOf(Date);
  });

  it('DESCARTAR guarda el motivo (sin espacios sobrantes)', async () => {
    const { observaciones, casoDeUso } = armar();

    const resultado = await casoDeUso.execute(
      40,
      { decision: 'DESCARTAR', motivo: '  Es un asiento de ajuste  ' },
      auditor,
    );

    expect(resultado.estado).toBe(EstadoObservacion.DESCARTADA);
    expect(resultado.motivoDescarte).toBe('Es un asiento de ajuste');
    expect(observaciones.revisiones[0].revisadaPorId).toBe(ID_AUDITOR);
  });

  it.each([undefined, '', '   '])(
    'DESCARTAR sin motivo (%j) es un 400 y no cambia nada',
    async (motivo) => {
      const { observaciones, casoDeUso } = armar();

      await expect(
        casoDeUso.execute(40, { decision: 'DESCARTAR', motivo }, auditor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(observaciones.revisiones).toEqual([]);
    },
  );

  it('REABRIR vuelve a dejarla ABIERTA y borra la revisión anterior', async () => {
    const { observaciones, casoDeUso } = armar({
      observacionInicial: observacion(
        ID_EJECUCION,
        EstadoObservacion.DESCARTADA,
      ),
    });

    const resultado = await casoDeUso.execute(
      40,
      { decision: 'REABRIR' },
      auditor,
    );

    expect(resultado.estado).toBe(EstadoObservacion.ABIERTA);
    expect(observaciones.revisiones[0]).toEqual({
      estado: EstadoObservacion.ABIERTA,
      motivoDescarte: null,
      revisadaPorId: null,
      revisadaEn: null,
    });
  });

  it('deja en la bitácora la decisión, el estado anterior y el nuevo', async () => {
    const { actividad, casoDeUso } = armar();

    await casoDeUso.execute(
      40,
      { decision: 'DESCARTAR', motivo: 'No corresponde' },
      auditor,
    );

    expect(actividad.cuentas).toEqual([ID_CUENTA]);
    expect(actividad.detalles).toEqual([
      {
        decision: 'DESCARTAR',
        estadoAnterior: EstadoObservacion.ABIERTA,
        estadoNuevo: EstadoObservacion.DESCARTADA,
        codigoRegla: validationsCode.V3,
        motivo: 'No corresponde',
      },
    ]);
  });

  it('un ADMIN puede revisar cualquier observación', async () => {
    const { casoDeUso } = armar();

    const resultado = await casoDeUso.execute(
      40,
      { decision: 'CONFIRMAR' },
      { usuarioId: 1, roles: [Rol.ADMIN] },
    );

    expect(resultado.estado).toBe(EstadoObservacion.CONFIRMADA);
  });

  it('404 si la observación no existe', async () => {
    const { casoDeUso } = armar({ observacionInicial: null });

    await expect(
      casoDeUso.execute(40, { decision: 'CONFIRMAR' }, auditor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 si el auditor no tiene asignado el organismo, antes que cualquier 409', async () => {
    const { observaciones, casoDeUso } = armar({
      estado: EstadoCuentaMensual.AUDITADA,
    });

    await expect(
      casoDeUso.execute(
        40,
        { decision: 'CONFIRMAR' },
        { usuarioId: 1, roles: [Rol.AUDITOR] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(observaciones.revisiones).toEqual([]);
  });

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
    const { observaciones, casoDeUso } = armar({ estado });

    await expect(
      casoDeUso.execute(40, { decision: 'CONFIRMAR' }, auditor),
    ).rejects.toThrow(new ConflictException(mensaje));
    expect(observaciones.revisiones).toEqual([]);
  });

  it('409 si la observación es de una ejecución anterior', async () => {
    const { observaciones, casoDeUso } = armar({
      observacionInicial: observacion(2),
      ultimaEjecucionId: ID_EJECUCION,
    });

    await expect(
      casoDeUso.execute(40, { decision: 'CONFIRMAR' }, auditor),
    ).rejects.toThrow(
      new ConflictException(
        'La observación pertenece a una ejecución anterior: revisá la más reciente.',
      ),
    );
    expect(observaciones.revisiones).toEqual([]);
  });
});
