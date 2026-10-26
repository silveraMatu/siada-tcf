import { EventoActividad } from '../../domain/entities/evento-actividad.domain.js';
import {
  RegistroActividadRepositoryPort,
  type FiltrosActividad,
  type PaginaActividad,
} from '../ports/out/registro-actividad-repository.port.js';
import {
  LIMITE_MAXIMO,
  LIMITE_POR_DEFECTO,
  ListarActividadUseCase,
} from './listar-actividad.use-case.js';

class RepositorioEspia extends RegistroActividadRepositoryPort {
  llamadas: { filtros: FiltrosActividad; limite: number; cursor?: number }[] =
    [];

  guardar(_evento: EventoActividad): Promise<void> {
    return Promise.resolve();
  }
  listar(
    filtros: FiltrosActividad,
    limite: number,
    cursor?: number,
  ): Promise<PaginaActividad> {
    this.llamadas.push({ filtros, limite, cursor });
    return Promise.resolve({ eventos: [], siguienteCursor: null });
  }
}

describe('ListarActividadUseCase', () => {
  it('pasa los filtros y el cursor al repositorio', async () => {
    const repositorio = new RepositorioEspia();

    await new ListarActividadUseCase(repositorio).execute({ dni: '1' }, 10, 99);

    expect(repositorio.llamadas).toEqual([
      { filtros: { dni: '1' }, limite: 10, cursor: 99 },
    ]);
  });

  it.each([
    [undefined, LIMITE_POR_DEFECTO],
    [0, 1],
    [-5, 1],
    [10_000, LIMITE_MAXIMO],
  ])('el límite %s se ajusta a %s', async (pedido, esperado) => {
    const repositorio = new RepositorioEspia();

    await new ListarActividadUseCase(repositorio).execute({}, pedido);

    expect(repositorio.llamadas[0].limite).toBe(esperado);
  });
});
