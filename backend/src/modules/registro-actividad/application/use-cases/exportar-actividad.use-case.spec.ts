import { EventoActividad } from '../../domain/entities/evento-actividad.domain.js';
import { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';
import { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import {
  RegistroActividadRepositoryPort,
  type FiltrosActividad,
  type PaginaActividad,
} from '../ports/out/registro-actividad-repository.port.js';
import { ExportarActividadUseCase } from './exportar-actividad.use-case.js';

const evento = (id: number, nombre = 'Ana') =>
  new EventoActividad({
    id,
    accion: AccionActividad.LOGIN,
    resultado: ResultadoActividad.EXITO,
    codigoHttp: 200,
    ocurridoEn: new Date('2026-10-26T15:00:00.000Z'),
    actor: {
      usuarioId: 1,
      nombre,
      apellido: 'Pérez',
      dni: '30111222',
      roles: ['AUDITOR', 'RESPONSABLE'],
    },
    ip: '10.0.0.1',
    userAgent: null,
    requestId: null,
    entidadTipo: null,
    entidadId: null,
    organismoId: null,
    cuentaMensualId: null,
    detalle: { email: 'ana@example.com' },
  });

//páginas de a 2 eventos, de mayor a menor id, para ver que se recorren todas
class RepositorioPaginado extends RegistroActividadRepositoryPort {
  pedidos: { filtros: FiltrosActividad; cursor?: number }[] = [];

  constructor(private readonly eventos: EventoActividad[]) {
    super();
  }

  guardar(): Promise<void> {
    return Promise.resolve();
  }
  listar(
    filtros: FiltrosActividad,
    limite: number,
    cursor?: number,
  ): Promise<PaginaActividad> {
    this.pedidos.push({ filtros, cursor });
    const restantes = this.eventos.filter(
      (e) => cursor === undefined || e.id! < cursor,
    );
    const pagina = restantes.slice(0, Math.min(limite, 2));
    const hayMas = restantes.length > pagina.length;
    return Promise.resolve({
      eventos: pagina,
      siguienteCursor: hayMas ? pagina.at(-1)!.id! : null,
    });
  }
}

describe('ExportarActividadUseCase', () => {
  it('arma el CSV con BOM, encabezado y una fila por evento, recorriendo todas las páginas', async () => {
    const repositorio = new RepositorioPaginado([
      evento(5),
      evento(4),
      evento(3),
    ]);
    const filtros = { dni: '30111222' };

    const csv = await new ExportarActividadUseCase(repositorio).execute(
      filtros,
    );

    expect(csv.startsWith('﻿id,fecha_hora,accion,')).toBe(true);
    const lineas = csv.replace('﻿', '').trim().split('\r\n');
    expect(lineas).toHaveLength(4);
    expect(lineas[1]).toBe(
      '"5","2026-10-26T15:00:00.000Z","LOGIN","EXITO","200","1","Ana","Pérez","30111222","AUDITOR|RESPONSABLE","10.0.0.1",,,,,"{""email"":""ana@example.com""}"',
    );
    //dos páginas pedidas, con los mismos filtros y el cursor de la primera
    expect(repositorio.pedidos.map((p) => p.cursor)).toEqual([undefined, 4]);
    expect(repositorio.pedidos.every((p) => p.filtros === filtros)).toBe(true);
  });

  it.each(['=1+1', '+54', '-2', '@SUMA(A1)'])(
    'un valor que empieza con %s se prefija con comilla simple para que no sea una fórmula',
    async (nombre) => {
      const repositorio = new RepositorioPaginado([evento(1, nombre)]);

      const csv = await new ExportarActividadUseCase(repositorio).execute({});

      expect(csv).toContain(`"'${nombre}"`);
    },
  );

  it('escapa las comillas dobles del contenido', async () => {
    const repositorio = new RepositorioPaginado([evento(1, 'Dijo "hola"')]);

    const csv = await new ExportarActividadUseCase(repositorio).execute({});

    expect(csv).toContain('"Dijo ""hola"""');
  });

  it('sin eventos devuelve solo el encabezado', async () => {
    const csv = await new ExportarActividadUseCase(
      new RepositorioPaginado([]),
    ).execute({});

    expect(csv.replace('﻿', '').trim().split('\r\n')).toHaveLength(1);
  });
});
