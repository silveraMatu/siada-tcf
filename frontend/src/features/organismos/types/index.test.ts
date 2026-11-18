import { describe, expect, it } from 'vitest';

import { CrearOrganismoSchema, etiquetaRubro, RUBROS } from './index';

const mensajes = (datos: unknown) => {
  const r = CrearOrganismoSchema.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('CrearOrganismoSchema', () => {
  it('acepta un organismo con un rubro del catálogo y recorta el nombre', () => {
    const r = CrearOrganismoSchema.safeParse({
      nombre: '  Ministerio de Turismo ',
      rubro: 'TURISMO',
    });
    expect(r.success && r.data).toEqual({
      nombre: 'Ministerio de Turismo',
      rubro: 'TURISMO',
    });
  });

  it.each(RUBROS.map((r) => r.valor))('acepta el rubro %s', (rubro) => {
    expect(mensajes({ nombre: 'X', rubro })).toEqual([]);
  });

  it('rechaza el nombre vacío y un rubro ausente', () => {
    expect(mensajes({ nombre: '   ' })).toEqual([
      'El nombre es obligatorio',
      'El rubro es obligatorio',
    ]);
  });

  it.each(['', 'Municipio', 'turismo'])(
    'rechaza un rubro fuera del catálogo (%j)',
    (rubro) => {
      expect(mensajes({ nombre: 'X', rubro })).toEqual([
        'El rubro es obligatorio',
      ]);
    },
  );

  it('rechaza un nombre de más de 255 caracteres', () => {
    expect(mensajes({ nombre: 'a'.repeat(256), rubro: 'OTROS' })).toEqual([
      'El nombre no puede superar los 255 caracteres',
    ]);
  });
});

describe('etiquetaRubro', () => {
  it('devuelve el nombre legible del catálogo', () => {
    expect(etiquetaRubro('TURISMO')).toBe('Turismo (Ministerio de Turismo)');
  });

  it('muestra tal cual un valor que no conoce', () => {
    expect(etiquetaRubro('Municipio')).toBe('Municipio');
  });

  it('el catálogo tiene 10 rubros, con OTROS al final', () => {
    expect(RUBROS).toHaveLength(10);
    expect(RUBROS.at(-1)?.valor).toBe('OTROS');
  });
});
