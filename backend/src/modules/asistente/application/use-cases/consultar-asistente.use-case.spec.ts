import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { AccesoCuentaService } from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { CuentaMensualListada } from '../../../cuentas/domain/entities/cuenta-mensual-listada.domain.js';
import { ResumenLibro } from '../../../cuentas/domain/entities/resumen-libro.domain.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { TipoLibro } from '../../../cuentas/domain/enums/tipo-libro.enum.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import {
  AsistenteNoConfiguradoError,
  AsistenteNoDisponibleError,
} from '../../domain/errors/asistente.errors.js';
import {
  AsistenteIAPort,
  type ConsultaIA,
  type RespuestaIA,
} from '../ports/out/asistente-ia.port.js';
import { ConsultarAsistenteUseCase } from './consultar-asistente.use-case.js';

const AUDITOR = 7;
const ORGANISMO = 1;
const OTRO_ORGANISMO = 2;

class IAFalsa extends AsistenteIAPort {
  consultas: ConsultaIA[] = [];
  falla: Error | null = null;

  consultar(consulta: ConsultaIA): Promise<RespuestaIA> {
    this.consultas.push(consulta);
    if (this.falla) return Promise.reject(this.falla);
    return Promise.resolve({ respuesta: 'Respuesta de prueba' });
  }
}

class OrganismosFalso extends OrganismoRepositoryPort {
  constructor(
    private readonly existentes: number[],
    private readonly asignados: number[],
  ) {
    super();
  }
  crear(): Promise<Organismo> {
    throw new Error('no usado');
  }
  buscarPorId(id: number): Promise<Organismo | null> {
    return Promise.resolve(
      this.existentes.includes(id)
        ? new Organismo('Municipalidad Demo', 'Municipalidad', true, id)
        : null,
    );
  }
  buscarTodos(): Promise<Organismo[]> {
    throw new Error('no usado');
  }
  asignarAuditor(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarIdsPorAuditor(): Promise<number[]> {
    return Promise.resolve(this.asignados);
  }
  esAuditorDelOrganismo(_auditorId: number, organismoId: number) {
    return Promise.resolve(this.asignados.includes(organismoId));
  }
  activar(): Promise<boolean> {
    throw new Error('no usado');
  }
  desactivar(): Promise<boolean> {
    throw new Error('no usado');
  }
}

const cuentaFebrero = new CuentaMensualListada(
  50,
  2,
  9,
  EstadoCuentaMensual.EN_AUDITORIA,
  new Date('2026-03-01T10:00:00Z'),
  ORGANISMO,
  'Municipalidad Demo',
  2026,
  [
    new ResumenLibro(
      3,
      TipoLibro.LIBRO_BANCO,
      '123',
      22,
      '2026-02-01',
      '2026-02-28',
    ),
  ],
  4,
  new Date('2026-03-02T10:00:00Z'),
  { id: 4, nombre: 'Ana', apellido: 'Gómez' },
);

class CuentasFalso extends CuentaMensualRepositoryPort {
  filtros: { organismoIds?: number[] }[] = [];
  existe(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<null> {
    throw new Error('no usado');
  }
  obtenerOrganismoId(): Promise<number | null> {
    throw new Error('no usado');
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
  listar(filtros?: {
    organismoIds?: number[];
  }): Promise<CuentaMensualListada[]> {
    this.filtros.push(filtros ?? {});
    // un listado filtrado por organismo solo devuelve lo de ese organismo
    return Promise.resolve(
      filtros?.organismoIds?.includes(ORGANISMO) ? [cuentaFebrero] : [],
    );
  }
}

class ActividadFalsa extends ContextoActividadPort {
  detalles: Record<string, unknown>[] = [];
  organismos: number[] = [];
  cuentas: number[] = [];
  actor(): void {}
  entidad(): void {}
  organismo(id: number): void {
    this.organismos.push(id);
  }
  cuentaMensual(id: number): void {
    this.cuentas.push(id);
  }
  detalle(datos: Record<string, unknown>): void {
    this.detalles.push(datos);
  }
}

function armar(opciones: { existentes?: number[]; asignados?: number[] } = {}) {
  const ia = new IAFalsa();
  const cuentas = new CuentasFalso();
  const actividad = new ActividadFalsa();
  const organismos = new OrganismosFalso(
    opciones.existentes ?? [ORGANISMO, OTRO_ORGANISMO],
    opciones.asignados ?? [ORGANISMO],
  );
  const useCase = new ConsultarAsistenteUseCase(
    ia,
    organismos,
    cuentas,
    new AccesoCuentaService(
      organismos,
      new ResponsableDelOrganismoService(undefined as never),
    ),
    actividad,
  );
  return { ia, cuentas, actividad, useCase };
}

const auditor = { usuarioId: AUDITOR, roles: [Rol.AUDITOR] };
const admin = { usuarioId: 1, roles: [Rol.ADMIN] };

describe('ConsultarAsistenteUseCase', () => {
  it('un auditor asignado consulta su organismo: la IA recibe el organismo y sus metadatos', async () => {
    const { ia, useCase } = armar();

    const resultado = await useCase.execute({
      actor: auditor,
      pregunta: '¿Cuánto se depositó?',
      organismoId: ORGANISMO,
    });

    expect(resultado).toEqual({
      respuesta: 'Respuesta de prueba',
      organismoId: ORGANISMO,
    });
    expect(ia.consultas).toEqual([
      {
        pregunta: '¿Cuánto se depositó?',
        organismoId: ORGANISMO,
        metadatosOrganismo: {
          nombre: 'Municipalidad Demo',
          rubro: 'Municipalidad',
          activo: true,
        },
        contextoRendicion: null,
      },
    ]);
  });

  it('un auditor que no tiene asignado el organismo recibe 403 y la IA no se llama', async () => {
    const { ia, actividad, useCase } = armar();

    await expect(
      useCase.execute({
        actor: auditor,
        pregunta: 'hola',
        organismoId: OTRO_ORGANISMO,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(ia.consultas).toEqual([]);
    //el rechazo queda en la bitácora con el organismo que intentó consultar
    expect(actividad.organismos).toEqual([OTRO_ORGANISMO]);
  });

  it('el permiso se evalúa antes que la existencia: un auditor no distingue un organismo ajeno de uno inexistente', async () => {
    const { useCase } = armar({ existentes: [ORGANISMO] });

    await expect(
      useCase.execute({ actor: auditor, pregunta: 'x', organismoId: 999 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un ADMIN consulta cualquier organismo existente; si no existe, 404', async () => {
    const { ia, useCase } = armar({ asignados: [] });

    await useCase.execute({
      actor: admin,
      pregunta: 'x',
      organismoId: OTRO_ORGANISMO,
    });
    expect(ia.consultas[0]?.organismoId).toBe(OTRO_ORGANISMO);

    await expect(
      useCase.execute({ actor: admin, pregunta: 'x', organismoId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('un rol sin acceso al organismo (por ejemplo RESPONSABLE de otro) recibe 403', async () => {
    const { useCase } = armar({ asignados: [] });

    await expect(
      useCase.execute({
        actor: { usuarioId: 9, roles: [Rol.JUEZ_TRAMITE] },
        pregunta: 'x',
        organismoId: ORGANISMO,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('sin organismoId en el pedido', () => {
    it('usa el único organismo asignado al auditor', async () => {
      const { ia, useCase } = armar({ asignados: [OTRO_ORGANISMO] });

      const resultado = await useCase.execute({
        actor: auditor,
        pregunta: 'x',
      });

      expect(resultado.organismoId).toBe(OTRO_ORGANISMO);
      expect(ia.consultas[0]?.organismoId).toBe(OTRO_ORGANISMO);
    });

    it('sin organismos asignados la IA recibe organismo null (responde que no audita ninguno)', async () => {
      const { ia, useCase } = armar({ asignados: [] });

      const resultado = await useCase.execute({
        actor: auditor,
        pregunta: 'x',
      });

      expect(resultado.organismoId).toBeNull();
      expect(ia.consultas).toEqual([
        {
          pregunta: 'x',
          organismoId: null,
          metadatosOrganismo: null,
          contextoRendicion: null,
        },
      ]);
    });

    it('con más de un organismo asignado pide indicar cuál (400) y no llama a la IA', async () => {
      const { ia, useCase } = armar({ asignados: [ORGANISMO, OTRO_ORGANISMO] });

      await expect(
        useCase.execute({ actor: auditor, pregunta: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ia.consultas).toEqual([]);
    });
  });

  describe('con cuentaMensualId', () => {
    it('manda el período de la rendición sin datos personales', async () => {
      const { ia, actividad, cuentas, useCase } = armar();

      await useCase.execute({
        actor: auditor,
        pregunta: 'x',
        organismoId: ORGANISMO,
        cuentaMensualId: 50,
      });

      expect(cuentas.filtros).toEqual([{ organismoIds: [ORGANISMO] }]);
      expect(ia.consultas[0]?.contextoRendicion).toEqual({
        cuentaMensualId: 50,
        ejercicioFiscal: 2026,
        mes: 2,
        estado: 'EN_AUDITORIA',
        presentadaPor: 'Ana Gómez',
        presentadaEn: '2026-03-02T10:00:00.000Z',
        libros: [
          {
            tipo: 'LIBRO_BANCO',
            numeroCuentaCte: '123',
            cantidadTransacciones: 22,
            fechaDesde: '2026-02-01',
            fechaHasta: '2026-02-28',
          },
        ],
      });
      expect(actividad.cuentas).toEqual([50]);
    });

    it('una cuenta que no es de ese organismo da 404 y la IA no se llama', async () => {
      const { ia, useCase } = armar();

      await expect(
        useCase.execute({
          actor: auditor,
          pregunta: 'x',
          organismoId: ORGANISMO,
          cuentaMensualId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ia.consultas).toEqual([]);
    });
  });

  it('si la IA no está disponible responde 502; si no está configurada, 503', async () => {
    const { ia, useCase } = armar();

    ia.falla = new AsistenteNoDisponibleError();
    await expect(
      useCase.execute({
        actor: auditor,
        pregunta: 'x',
        organismoId: ORGANISMO,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    ia.falla = new AsistenteNoConfiguradoError();
    await expect(
      useCase.execute({
        actor: auditor,
        pregunta: 'x',
        organismoId: ORGANISMO,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('la bitácora recibe solo largos y duración, nunca el texto de la pregunta ni de la respuesta', async () => {
    const { actividad, useCase } = armar();

    await useCase.execute({
      actor: auditor,
      pregunta: 'Pregunta con datos sensibles',
      organismoId: ORGANISMO,
    });

    const detalle = Object.assign({}, ...actividad.detalles) as Record<
      string,
      unknown
    >;
    expect(detalle).toMatchObject({
      preguntaLongitud: 'Pregunta con datos sensibles'.length,
      respuestaLongitud: 'Respuesta de prueba'.length,
    });
    expect(typeof detalle.duracionMs).toBe('number');
    expect(JSON.stringify(detalle)).not.toContain('sensibles');
    expect(JSON.stringify(detalle)).not.toContain('Respuesta de prueba');
  });
});
