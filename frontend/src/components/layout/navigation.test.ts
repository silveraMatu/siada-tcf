import { describe, expect, it } from 'vitest';

import {
  filtrarNavegacion,
  navigationGroups,
  puedeVer,
  rutaInicial,
  type NavGroup,
} from './navigation';

const rutasVisibles = (roles: readonly string[] | null | undefined) =>
  filtrarNavegacion(navigationGroups, roles).flatMap((g) =>
    g.items.map((i) => i.to),
  );

describe('filtrarNavegacion', () => {
  it.each([[[]], [undefined], [null], [['ROL_INEXISTENTE']]])(
    'sin roles válidos (%j) no muestra ninguna ruta protegida',
    (roles) => {
      expect(rutasVisibles(roles)).toEqual([]);
      expect(filtrarNavegacion(navigationGroups, roles)).toEqual([]);
    },
  );

  it('ADMIN ve gestión, auditoría y solicitudes, pero no la ingesta', () => {
    expect(rutasVisibles(['ADMIN'])).toEqual([
      '/organismos',
      '/responsables',
      '/auditoria',
      '/admin/usuarios',
    ]);
  });

  it('JUEZ_TRAMITE solo ve organismos (el panel de auditoría es de AUDITOR y ADMIN)', () => {
    expect(rutasVisibles(['JUEZ_TRAMITE'])).toEqual(['/organismos']);
  });

  it('AUDITOR solo ve auditoría', () => {
    expect(rutasVisibles(['AUDITOR'])).toEqual(['/auditoria']);
  });

  it('RESPONSABLE solo ve la ingesta de libro banco', () => {
    expect(rutasVisibles(['RESPONSABLE'])).toEqual(['/libro-banco']);
  });

  it('con varios roles une lo que habilita cada uno', () => {
    expect(rutasVisibles(['RESPONSABLE', 'AUDITOR'])).toEqual([
      '/libro-banco',
      '/auditoria',
    ]);
  });

  it('descarta los grupos que quedan vacíos', () => {
    const grupos = filtrarNavegacion(navigationGroups, ['RESPONSABLE']);
    expect(grupos.map((g) => g.label)).toEqual(['Gestión']);
  });
});

describe('puedeVer', () => {
  it('un ítem sin allowedRoles es público', () => {
    expect(puedeVer({}, [])).toBe(true);
    expect(puedeVer({}, undefined)).toBe(true);
  });

  it('allowedRoles vacío no lo ve nadie', () => {
    expect(puedeVer({ allowedRoles: [] }, ['ADMIN'])).toBe(false);
  });

  it('los públicos se conservan aunque no haya roles', () => {
    const grupos: NavGroup[] = [
      {
        label: 'Público',
        items: [{ to: '/ayuda', label: 'Ayuda', icon: navigationGroups[0].items[0].icon }],
      },
    ];
    expect(filtrarNavegacion(grupos, [])).toHaveLength(1);
  });
});

describe('rutaInicial', () => {
  it('lleva a la primera sección visible de cada rol', () => {
    expect(rutaInicial(['ADMIN'])).toBe('/organismos');
    expect(rutaInicial(['RESPONSABLE'])).toBe('/libro-banco');
    expect(rutaInicial(['AUDITOR'])).toBe('/auditoria');
  });

  it('vuelve a la raíz si no tiene ninguna', () => {
    expect(rutaInicial([])).toBe('/');
    expect(rutaInicial(undefined)).toBe('/');
  });
});
