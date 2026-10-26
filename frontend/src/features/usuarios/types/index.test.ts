import { describe, expect, it } from 'vitest';

import {
  alternarRol,
  restriccionPropia,
  ROL_LABEL,
  ROLES,
  type Rol,
} from './index';

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

  it('el rol SUPERVISOR existe, se muestra último y se ordena como los demás', () => {
    expect(ROLES.at(-1)).toBe('SUPERVISOR');
    expect(ROL_LABEL.SUPERVISOR).toBe('Supervisor');
    expect(alternarRol(['SUPERVISOR'], 'AUDITOR')).toEqual([
      'AUDITOR',
      'SUPERVISOR',
    ]);
  });

  it('no muta el arreglo original', () => {
    const original: Rol[] = ['AUDITOR'];
    alternarRol(original, 'ADMIN');
    expect(original).toEqual(['AUDITOR']);
  });
});

describe('restriccionPropia', () => {
  it('bloquea desactivarse a sí mismo', () => {
    expect(restriccionPropia(1, 1, ['ADMIN'])).toMatchObject({
      esPropia: true,
      noPuedeDesactivar: true,
    });
  });

  it('acepta un sub numérico en texto', () => {
    expect(restriccionPropia(1, '1', ['ADMIN']).esPropia).toBe(true);
  });

  it('bloquea quitarse ADMIN, pero no otros roles', () => {
    expect(restriccionPropia(1, 1, ['AUDITOR']).noPuedeQuitarseAdmin).toBe(
      true,
    );
    expect(
      restriccionPropia(1, 1, ['ADMIN', 'AUDITOR']).noPuedeQuitarseAdmin,
    ).toBe(false);
  });

  it('no restringe a otros usuarios ni sin sesión', () => {
    expect(restriccionPropia(2, 1, [])).toEqual({
      esPropia: false,
      noPuedeDesactivar: false,
      noPuedeQuitarseAdmin: false,
    });
    expect(restriccionPropia(2, undefined, []).esPropia).toBe(false);
    expect(restriccionPropia(2, null, []).esPropia).toBe(false);
  });
});
