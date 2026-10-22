import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { leerLibroDuplicado } from './libro-duplicado';

const errorHttp = (status: number, data: unknown) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('leerLibroDuplicado', () => {
  it('devuelve los datos del libro existente ante el 409 LIBRO_DUPLICADO', () => {
    const error = errorHttp(409, {
      statusCode: 409,
      codigo: 'LIBRO_DUPLICADO',
      message: 'Ya existe un libro',
      libroExistente: {
        id: 40,
        numeroCuentaCte: '100234/1',
        fechaCreacion: '2026-10-15T12:00:00.000Z',
        cantidadTransacciones: 10,
      },
    });

    expect(leerLibroDuplicado(error)).toEqual({
      id: 40,
      numeroCuentaCte: '100234/1',
      fechaCreacion: '2026-10-15T12:00:00.000Z',
      cantidadTransacciones: 10,
    });
  });

  it('un 409 con otro código (por ejemplo la cuenta ya presentada) no es un duplicado', () => {
    expect(
      leerLibroDuplicado(
        errorHttp(409, { message: 'La cuenta ya fue presentada' }),
      ),
    ).toBeNull();
  });

  it('el código de duplicado con otro status tampoco cuenta', () => {
    expect(
      leerLibroDuplicado(
        errorHttp(400, {
          codigo: 'LIBRO_DUPLICADO',
          libroExistente: { id: 1 },
        }),
      ),
    ).toBeNull();
  });

  it('sin datos del libro existente devuelve null', () => {
    expect(
      leerLibroDuplicado(errorHttp(409, { codigo: 'LIBRO_DUPLICADO' })),
    ).toBeNull();
  });

  it.each([[new Error('x')], [null], [undefined], ['texto']])(
    'un error que no es de axios (%s) devuelve null',
    (error) => {
      expect(leerLibroDuplicado(error)).toBeNull();
    },
  );
});
