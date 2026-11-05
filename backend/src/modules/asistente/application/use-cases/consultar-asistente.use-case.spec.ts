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
  type EventoIA,
  type PasoIA,
  type RespuestaIA,
} from '../ports/out/asistente-ia.port.js';
import {
  ConsultarAsistenteUseCase,
  type EventoAsistente,
} from './consultar-asistente.use-case.js';

const AUDITOR = 7;
const ORGANISMO = 1;
const OTRO_ORGANISMO = 2;

class IAFalsa extends AsistenteIAPort {
  consultas: ConsultaIA[] = [];
  //falla al pedir la consulta (servicio caído o sin configurar)
  falla: Error | null = null;
  pasos: PasoIA[] = [];
  //lo que emite la consulta en vivo y, si se indica, el fallo a mitad del flujo (después de emitirlo todo)
  eventos: EventoIA[] = [];
  fallaEnFlujo: Error | null = null;
  cancelaciones: (AbortSignal | undefined)[] = [];

  consultar(consulta: ConsultaIA): Promise<RespuestaIA> {
    this.consultas.push(consulta);
    if (this.falla) return Promise.reject(this.falla);
    return Promise.resolve({
      respuesta: 'Respuesta de prueba',
      pasos: this.pasos,
    });
  }

  iniciarConsultaEnVivo(
    consulta: ConsultaIA,
    cancelacion?: AbortSignal,
  ): Promise<AsyncIterable<EventoIA>> {
    this.consultas.push(consulta);
    this.cancelaciones.push(cancelacion);
    if (this.falla) return Promise.reject(this.falla);
    const { eventos, fallaEnFlujo } = this;
    async function* flujo(): AsyncGenerator<EventoIA> {
      await Promise.resolve();
      for (const evento of eventos) yield evento;
      if (fallaEnFlujo) throw fallaEnFlujo;
    }
    return Promise.resolve(flujo());
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
      pasos: [],
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

const pasoEnCurso: PasoIA = {
  id: 'c1',
  accion: 'consulta_datos',
  descripcion: 'Total de depósitos del libro banco de febrero',
  fuentes: ['libro banco'],
  estado: 'en_curso',
  resultado: null,
  cantidadRegistros: null,
  duracionMs: null,
  parcial: false,
};
const pasoOk: PasoIA = {
  ...pasoEnCurso,
  estado: 'completado',
  resultado: 'Encontré 1 registro',
  cantidadRegistros: 1,
  duracionMs: 12,
};
const pasoFallido: PasoIA = {
  ...pasoEnCurso,
  id: 'c2',
  descripcion: 'Mostrar los datos de acceso de las personas',
  fuentes: [],
  estado: 'error',
  resultado: 'No pude completar este paso',
};

describe('ConsultarAsistenteUseCase: razonamiento de la IA', () => {
  it('devuelve al auditor los pasos de la IA tal cual, incluidos los intentos fallidos', async () => {
    const { ia, useCase } = armar();
    ia.pasos = [pasoFallido, pasoOk];

    const resultado = await useCase.execute({
      actor: auditor,
      pregunta: 'x',
      organismoId: ORGANISMO,
    });

    expect(resultado.pasos).toEqual([pasoFallido, pasoOk]);
  });

  it('la bitácora recibe solo cantidades: ni los textos del razonamiento ni de las fuentes', async () => {
    const { ia, actividad, useCase } = armar();
    ia.pasos = [pasoFallido, pasoOk];

    await useCase.execute({
      actor: auditor,
      pregunta: 'x',
      organismoId: ORGANISMO,
    });

    const detalle = Object.assign({}, ...actividad.detalles) as Record<
      string,
      unknown
    >;
    expect(detalle).toMatchObject({ consultasSql: 2, consultasConError: 1 });
    const crudo = JSON.stringify(detalle);
    expect(crudo).not.toContain('libro banco');
    expect(crudo).not.toContain('depósitos');
    expect(crudo).not.toContain('datos de acceso');
  });

  it('sin pasos la bitácora cuenta cero y el auditor recibe una lista vacía', async () => {
    const { actividad, useCase } = armar();

    const resultado = await useCase.execute({
      actor: auditor,
      pregunta: 'x',
      organismoId: ORGANISMO,
    });

    expect(resultado.pasos).toEqual([]);
    expect(Object.assign({}, ...actividad.detalles)).toMatchObject({
      consultasSql: 0,
      consultasConError: 0,
    });
  });
});

const flujoCompleto: EventoIA[] = [
  { tipo: 'pensando', mensaje: 'Analizando tu pregunta' },
  { tipo: 'paso', paso: pasoEnCurso },
  { tipo: 'paso', paso: pasoOk },
  { tipo: 'pensando', mensaje: 'Analizando los resultados' },
  { tipo: 'respuesta', respuesta: 'Se depositaron $1.231.900,10' },
];

async function recorrer(
  flujo: AsyncGenerator<EventoAsistente>,
): Promise<EventoAsistente[]> {
  const recibidos: EventoAsistente[] = [];
  for await (const evento of flujo) recibidos.push(evento);
  return recibidos;
}

describe('ConsultarAsistenteUseCase: consulta en vivo', () => {
  const consultaOk = {
    actor: auditor,
    pregunta: 'x',
    organismoId: ORGANISMO,
  };

  it('reenvía los eventos en orden y la respuesta final trae el organismo consultado', async () => {
    const { ia, useCase } = armar();
    ia.eventos = flujoCompleto;

    const preparada = await useCase.preparar(consultaOk);
    const recibidos = await recorrer(await useCase.transmitir(preparada));

    expect(recibidos).toEqual([
      ...flujoCompleto.slice(0, 4),
      {
        tipo: 'respuesta',
        respuesta: 'Se depositaron $1.231.900,10',
        organismoId: ORGANISMO,
      },
    ]);
  });

  it('al terminar deja en la bitácora solo cantidades, contando los pasos terminados (no los «en curso»)', async () => {
    const { ia, actividad, useCase } = armar();
    ia.eventos = [
      ...flujoCompleto.slice(0, 3),
      { tipo: 'paso', paso: pasoFallido },
      flujoCompleto[4]!,
    ];

    await recorrer(
      await useCase.transmitir(await useCase.preparar(consultaOk)),
    );

    const detalle = Object.assign({}, ...actividad.detalles) as Record<
      string,
      unknown
    >;
    //c1 terminó (en curso → completado) y c2 llegó ya con error
    expect(detalle).toMatchObject({
      consultasSql: 2,
      consultasConError: 1,
      respuestaLongitud: 'Se depositaron $1.231.900,10'.length,
    });
    expect(typeof detalle.duracionMs).toBe('number');
    expect(JSON.stringify(detalle)).not.toContain('libro banco');
  });

  it('la validación de acceso ocurre antes de abrir el flujo: un auditor ajeno recibe 403 y la IA no se llama', async () => {
    const { ia, useCase } = armar();

    await expect(
      useCase.preparar({ ...consultaOk, organismoId: OTRO_ORGANISMO }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ia.consultas).toEqual([]);
  });

  it('un servicio caído o sin configurar falla al abrir el flujo, con su código HTTP normal', async () => {
    const { ia, useCase } = armar();
    const preparada = await useCase.preparar(consultaOk);

    ia.falla = new AsistenteNoDisponibleError();
    await expect(useCase.transmitir(preparada)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    ia.falla = new AsistenteNoConfiguradoError();
    await expect(useCase.transmitir(preparada)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('si el flujo falla a mitad entrega lo anterior, lanza 502 y la bitácora igual recibe lo contado', async () => {
    const { ia, actividad, useCase } = armar();
    ia.eventos = flujoCompleto.slice(0, 3);
    ia.fallaEnFlujo = new AsistenteNoDisponibleError();
    const recibidos: EventoAsistente[] = [];

    const flujo = await useCase.transmitir(await useCase.preparar(consultaOk));
    await expect(
      (async () => {
        for await (const evento of flujo) recibidos.push(evento);
      })(),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(recibidos).toHaveLength(3);
    expect(Object.assign({}, ...actividad.detalles)).toMatchObject({
      consultasSql: 1,
      consultasConError: 0,
    });
  });

  it('le pasa la señal de cancelación a la IA', async () => {
    const { ia, useCase } = armar();
    ia.eventos = [];
    const cancelacion = new AbortController();

    await recorrer(
      await useCase.transmitir(
        await useCase.preparar(consultaOk),
        cancelacion.signal,
      ),
    );

    expect(ia.cancelaciones[0]).toBe(cancelacion.signal);
  });
});
