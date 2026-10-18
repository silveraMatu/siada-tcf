import { describe, expect, it } from 'vitest';

import { CrearOrganismoSchema } from './index';

const mensajes = (datos: unknown) => {
  const r = CrearOrganismoSchema.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('CrearOrganismoSchema', () => {
  it('acepta un organismo válido y recorta los espacios', () => {
    const r = CrearOrganismoSchema.safeParse({
      nombre: '  Municipalidad de Clorinda ',
      rubro: ' Municipio ',
    });
    expect(r.success && r.data).toEqual({
      nombre: 'Municipalidad de Clorinda',
      rubro: 'Municipio',
    });
  });

  it.each(['', '   '])('rechaza nombre y rubro vacíos (%j)', (vacio) => {
    expect(mensajes({ nombre: vacio, rubro: vacio })).toEqual([
      'El nombre es obligatorio',
      'El rubro es obligatorio',
    ]);
  });

  it('rechaza valores de más de 255 caracteres', () => {
    expect(mensajes({ nombre: 'a'.repeat(256), rubro: 'ok' })).toEqual([
      'El nombre no puede superar los 255 caracteres',
    ]);
    expect(mensajes({ nombre: 'ok', rubro: 'a'.repeat(256) })).toEqual([
      'El rubro no puede superar los 255 caracteres',
    ]);
  });
});
