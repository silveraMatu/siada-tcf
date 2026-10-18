import { describe, expect, it } from 'vitest';

import { LoginSchema, RegistroSchema } from './index';

const valido = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '12345678',
  email: 'ana@organismo.gob.ar',
  password: 'segura123',
};

const mensajes = (datos: unknown) => {
  const resultado = RegistroSchema.safeParse(datos);
  return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
};

describe('RegistroSchema', () => {
  it('acepta un registro válido', () => {
    expect(RegistroSchema.safeParse(valido).success).toBe(true);
  });

  it('acepta el DNI con puntos o guiones', () => {
    expect(
      RegistroSchema.safeParse({ ...valido, dni: '12.345.678' }).success,
    ).toBe(true);
  });

  it.each(['123456', '123456789', '20-12345678-9', 'abcdefgh'])(
    'rechaza el DNI %s',
    (dni) => {
      expect(mensajes({ ...valido, dni })).toContain(
        'El DNI debe tener 7 u 8 dígitos',
      );
    },
  );

  it('exige el DNI', () => {
    expect(mensajes({ ...valido, dni: '  ' })).toContain('El DNI es obligatorio');
  });

  it('rechaza un email inválido', () => {
    expect(mensajes({ ...valido, email: 'no-es-email' })).toContain(
      'El email no es válido',
    );
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    expect(mensajes({ ...valido, password: '1234567' })).toContain(
      'La contraseña debe tener al menos 8 caracteres',
    );
  });

  it('rechaza una contraseña de más de 72 bytes', () => {
    expect(mensajes({ ...valido, password: 'ñ'.repeat(37) })).toContain(
      'La contraseña no puede superar los 72 bytes',
    );
  });
});

describe('LoginSchema', () => {
  it('acepta credenciales válidas, sin exigir un largo mínimo de contraseña', () => {
    expect(
      LoginSchema.safeParse({ email: 'ana@organismo.gob.ar', password: 'x' })
        .success,
    ).toBe(true);
  });

  it('rechaza un email inválido', () => {
    const r = LoginSchema.safeParse({ email: 'no-es-email', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('exige la contraseña', () => {
    const r = LoginSchema.safeParse({ email: 'ana@organismo.gob.ar', password: '' });
    expect(r.success).toBe(false);
  });
});
