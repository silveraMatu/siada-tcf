import { describe, expect, it } from 'vitest';

import { ErrorAsistente, MENSAJE_SIN_RESPUESTA } from '../api/asistente.api';
import {
  MENSAJE_NO_DISPONIBLE,
  esCancelacion,
  mensajeDeError,
} from './errores';

describe('mensajeDeError', () => {
  it.each([502, 503, 504])(
    'un %s se muestra como copiloto no disponible',
    (estado) => {
      expect(
        mensajeDeError(
          new ErrorAsistente('El asistente no está configurado.', estado),
        ),
      ).toBe(MENSAJE_NO_DISPONIBLE);
    },
  );

  it('sin conexión con el servidor (fetch rechaza con TypeError) se muestra como no disponible', () => {
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toBe(
      MENSAJE_NO_DISPONIBLE,
    );
  });

  it('un flujo cortado sin respuesta se muestra como no disponible', () => {
    expect(mensajeDeError(new ErrorAsistente(MENSAJE_SIN_RESPUESTA))).toBe(
      MENSAJE_NO_DISPONIBLE,
    );
  });

  it('un error del flujo conserva el aviso que mandó el servidor', () => {
    expect(
      mensajeDeError(new ErrorAsistente('Algo salió mal en el asistente.')),
    ).toBe('Algo salió mal en el asistente.');
  });

  it('un 401 invita a iniciar sesión de nuevo', () => {
    expect(mensajeDeError(new ErrorAsistente('x', 401))).toMatch(
      /sesión venció/,
    );
  });

  it.each([
    [400, 'La pregunta es obligatoria'],
    [403, 'El organismo no está entre los que tiene asignados.'],
    [404, 'El organismo no existe.'],
  ])('un %s conserva el mensaje del backend', (estado, mensaje) => {
    expect(mensajeDeError(new ErrorAsistente(mensaje, estado))).toBe(mensaje);
  });
});

describe('esCancelacion', () => {
  it('reconoce el AbortError de fetch y nada más', () => {
    expect(esCancelacion(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(esCancelacion(new TypeError('Failed to fetch'))).toBe(false);
    expect(esCancelacion(new ErrorAsistente('x'))).toBe(false);
  });
});
