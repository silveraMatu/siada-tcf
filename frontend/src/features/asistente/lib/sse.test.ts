import { describe, expect, it } from 'vitest';

import { interpretarEvento, leerEventosSse, type EventoSse } from './sse';

function flujo(...fragmentos: string[]) {
  const codificador = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controlador) {
      for (const f of fragmentos) controlador.enqueue(codificador.encode(f));
      controlador.close();
    },
  });
}

async function leer(...fragmentos: string[]) {
  const eventos: EventoSse[] = [];
  for await (const e of leerEventosSse(flujo(...fragmentos))) eventos.push(e);
  return eventos;
}

describe('leerEventosSse', () => {
  it('separa los eventos por línea en blanco', async () => {
    expect(
      await leer(
        'event: pensando\ndata: {"mensaje":"a"}\n\nevent: fin\ndata: {}\n\n',
      ),
    ).toEqual([
      { evento: 'pensando', datos: '{"mensaje":"a"}' },
      { evento: 'fin', datos: '{}' },
    ]);
  });

  it('une un evento partido en varios fragmentos, incluso en mitad de una palabra o de un \\r\\n', async () => {
    expect(
      await leer(
        'eve',
        'nt: respu',
        'esta\r',
        '\ndata: {"respuesta":"hola"}\r',
        '\n\r\n',
      ),
    ).toEqual([{ evento: 'respuesta', datos: '{"respuesta":"hola"}' }]);
  });

  it('ignora los comentarios de keepalive', async () => {
    expect(
      await leer(': keepalive\n\nevent: fin\ndata: {}\n\n: otro\n\n'),
    ).toEqual([{ evento: 'fin', datos: '{}' }]);
  });

  it('junta varias líneas data de un mismo evento', async () => {
    expect(await leer('event: x\ndata: uno\ndata: dos\n\n')).toEqual([
      { evento: 'x', datos: 'uno\ndos' },
    ]);
  });

  it('entrega el último evento aunque falte la línea en blanco final', async () => {
    expect(await leer('event: fin\ndata: {}')).toEqual([
      { evento: 'fin', datos: '{}' },
    ]);
  });

  it('un evento sin nombre es «message»', async () => {
    expect(await leer('data: {"a":1}\n\n')).toEqual([
      { evento: 'message', datos: '{"a":1}' },
    ]);
  });
});

describe('interpretarEvento', () => {
  const evento = (nombre: string, dato: unknown): EventoSse => ({
    evento: nombre,
    datos: JSON.stringify(dato),
  });

  it('interpreta un paso y completa lo que falte', () => {
    expect(
      interpretarEvento(
        evento('paso', {
          id: 'p1',
          accion: 'consulta_datos',
          descripcion: 'Total de depósitos',
          fuentes: ['libro banco', 7],
          estado: 'completado',
          resultado: 'Encontré 1 registro',
          cantidadRegistros: 1,
          duracionMs: 50,
          parcial: false,
        }),
      ),
    ).toEqual({
      tipo: 'paso',
      paso: {
        id: 'p1',
        accion: 'consulta_datos',
        descripcion: 'Total de depósitos',
        fuentes: ['libro banco'],
        estado: 'completado',
        resultado: 'Encontré 1 registro',
        cantidadRegistros: 1,
        duracionMs: 50,
        parcial: false,
      },
    });

    expect(
      interpretarEvento(
        evento('paso', { id: 'p2', descripcion: 'x', estado: 'en_curso' }),
      ),
    ).toMatchObject({
      paso: {
        fuentes: [],
        resultado: null,
        cantidadRegistros: null,
        parcial: false,
      },
    });
  });

  it('interpreta la respuesta, el aviso de pensando, el fin y el error', () => {
    expect(
      interpretarEvento(
        evento('respuesta', { respuesta: 'Hola', organismoId: 3 }),
      ),
    ).toEqual({ tipo: 'respuesta', respuesta: 'Hola', organismoId: 3 });
    expect(
      interpretarEvento(
        evento('pensando', { mensaje: 'Analizando tu pregunta' }),
      ),
    ).toEqual({ tipo: 'pensando', mensaje: 'Analizando tu pregunta' });
    expect(interpretarEvento(evento('fin', {}))).toEqual({ tipo: 'fin' });
    expect(interpretarEvento(evento('error', { mensaje: 'Falló' }))).toEqual({
      tipo: 'error',
      mensaje: 'Falló',
    });
  });

  it('ignora eventos desconocidos o mal formados en vez de romperse', () => {
    expect(interpretarEvento(evento('nuevo_tipo', { a: 1 }))).toBeNull();
    expect(
      interpretarEvento({ evento: 'paso', datos: 'no es json' }),
    ).toBeNull();
    expect(interpretarEvento(evento('paso', { id: 1 }))).toBeNull();
    expect(interpretarEvento(evento('respuesta', {}))).toBeNull();
    expect(interpretarEvento({ evento: 'fin', datos: '[1]' })).toBeNull();
  });
});
