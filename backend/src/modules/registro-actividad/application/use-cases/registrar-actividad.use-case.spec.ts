import { ContextoActividad } from '../../domain/entities/contexto-actividad.domain.js';
import {
  EventoActividad,
  type ActorActividad,
} from '../../domain/entities/evento-actividad.domain.js';
import { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';
import { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import {
  RegistroActividadRepositoryPort,
  type PaginaActividad,
} from '../ports/out/registro-actividad-repository.port.js';
import {
  RegistrarActividadUseCase,
  type RegistrarActividadComando,
} from './registrar-actividad.use-case.js';

class RepositorioFalso extends RegistroActividadRepositoryPort {
  guardados: EventoActividad[] = [];

  guardar(evento: EventoActividad): Promise<void> {
    this.guardados.push(evento);
    return Promise.resolve();
  }
  listar(): Promise<PaginaActividad> {
    return Promise.resolve({ eventos: [], siguienteCursor: null });
  }
}

const ana: ActorActividad = {
  usuarioId: 1,
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  roles: ['AUDITOR'],
};
const beto: ActorActividad = { ...ana, usuarioId: 2, nombre: 'Beto' };

const comando = (
  extra: Partial<RegistrarActividadComando> = {},
): RegistrarActividadComando => ({
  accion: AccionActividad.CUENTA_PRESENTADA,
  resultado: ResultadoActividad.EXITO,
  codigoHttp: 200,
  actorAutenticado: ana,
  contexto: new ContextoActividad(),
  ip: '10.0.0.1',
  userAgent: 'vitest',
  requestId: 'abc',
  ...extra,
});

describe('RegistrarActividadUseCase', () => {
  let repositorio: RepositorioFalso;
  let casoDeUso: RegistrarActividadUseCase;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    casoDeUso = new RegistrarActividadUseCase(repositorio);
  });

  it('guarda el evento con el actor autenticado y los datos de la petición', async () => {
    await casoDeUso.execute(comando());

    expect(repositorio.guardados).toHaveLength(1);
    expect(repositorio.guardados[0]).toMatchObject({
      accion: AccionActividad.CUENTA_PRESENTADA,
      resultado: ResultadoActividad.EXITO,
      codigoHttp: 200,
      actor: ana,
      ip: '10.0.0.1',
      userAgent: 'vitest',
      requestId: 'abc',
      detalle: null,
    });
    expect(repositorio.guardados[0].ocurridoEn).toBeInstanceOf(Date);
  });

  it('el actor del contexto (login, registro) pisa al autenticado', async () => {
    const contexto = new ContextoActividad();
    contexto.actor = beto;

    await casoDeUso.execute(comando({ contexto }));

    expect(repositorio.guardados[0].actor).toEqual(beto);
  });

  it('sin usuario autenticado ni actor en el contexto el actor es null', async () => {
    await casoDeUso.execute(comando({ actorAutenticado: null }));

    expect(repositorio.guardados[0].actor).toBeNull();
  });

  it('lo que sumaron los casos de uso pisa lo que declaró el endpoint, y el resto se conserva', async () => {
    const contexto = new ContextoActividad();
    contexto.organismoId = 7;
    contexto.detalle = { filas: 3 };

    await casoDeUso.execute(
      comando({
        contexto,
        entidadTipo: 'CUENTA_MENSUAL',
        entidadId: 5,
        organismoId: 99,
        cuentaMensualId: 5,
      }),
    );

    expect(repositorio.guardados[0]).toMatchObject({
      entidadTipo: 'CUENTA_MENSUAL',
      entidadId: 5,
      organismoId: 7,
      cuentaMensualId: 5,
      detalle: { filas: 3 },
    });
  });

  it('recorta el user-agent a 255 caracteres', async () => {
    await casoDeUso.execute(comando({ userAgent: 'x'.repeat(400) }));

    expect(repositorio.guardados[0].userAgent).toHaveLength(255);
  });

  it('marca el contexto como registrado para no guardar el evento dos veces', async () => {
    const contexto = new ContextoActividad();

    await casoDeUso.execute(comando({ contexto }));

    expect(contexto.registrado).toBe(true);
  });

  it('si no se pudo guardar el contexto no queda marcado y el error se propaga', async () => {
    const contexto = new ContextoActividad();
    repositorio.guardar = () => Promise.reject(new Error('base caída'));

    await expect(casoDeUso.execute(comando({ contexto }))).rejects.toThrow(
      'base caída',
    );
    expect(contexto.registrado).toBe(false);
  });
});
