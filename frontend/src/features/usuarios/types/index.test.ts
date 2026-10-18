import { describe, expect, it } from 'vitest';

import { alternarRol, type Rol } from './index';

describe('alternarRol', () => {
  it('agrega un rol que no estaba', () => {
    expect(alternarRol([], 'AUDITOR')).toEqual(['AUDITOR']);
  });

  it('quita un rol que ya estaba', () => {
    expect(alternarRol(['AUDITOR', 'RESPONSABLE'], 'AUDITOR')).toEqual([
      'RESPONSABLE',
    ]);
  });

  it('mantiene el orden de visualización sin importar el orden de clic', () => {
    const roles = alternarRol(['RESPONSABLE'], 'ADMIN');
    expect(roles).toEqual(['ADMIN', 'RESPONSABLE']);
  });

  it('no muta el arreglo original', () => {
    const original: Rol[] = ['AUDITOR'];
    alternarRol(original, 'ADMIN');
    expect(original).toEqual(['AUDITOR']);
  });
});
