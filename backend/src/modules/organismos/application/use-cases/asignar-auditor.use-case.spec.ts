import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../usuarios/domain/entities/usuario.domain.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { Organismo } from '../../domain/entities/organismo.domain.js';
import { OrganismoRepositoryPort } from '../ports/out/organismo-repository.port.js';
import { AsignarAuditorUseCase } from './asignar-auditor.use-case.js';
import { QuitarAuditorUseCase } from './quitar-auditor.use-case.js';

class OrganismosFalso extends OrganismoRepositoryPort {
  asignaciones: (number | null)[] = [];

  constructor(public organismo: Organismo | null) {
    super();
  }

  crear(): Promise<Organismo> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<Organismo | null> {
    return Promise.resolve(this.organismo);
  }
  buscarTodos(): Promise<Organismo[]> {
    throw new Error('no usado');
  }
  activar(): Promise<boolean> {
    throw new Error('no usado');
  }
  desactivar(): Promise<boolean> {
    throw new Error('no usado');
  }
  asignarAuditor(_id: number, auditorId: number | null): Promise<boolean> {
    this.asignaciones.push(auditorId);
    const o = this.organismo;
    this.organismo =
      o &&
      new Organismo(
        o.nombre,
        o.rubro,
        o.active,
        o.id,
        o.fechaCreacion,
        auditorId,
      );
    return Promise.resolve(true);
  }
  buscarIdsPorAuditor(): Promise<number[]> {
    throw new Error('no usado');
  }
  esAuditorDelOrganismo(): Promise<boolean> {
    throw new Error('no usado');
  }
}

class UsuariosFalso extends UsuarioRepositoryPort {
  constructor(private readonly usuario: UsuarioSinPassword | null) {
    super();
  }
  crear(): Promise<Usuario> {
    throw new Error('no usado');
  }
  buscarPorEmail(): Promise<Usuario | null> {
    throw new Error('no usado');
  }
  buscarPorDni(): Promise<Usuario | null> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<UsuarioSinPassword | null> {
    return Promise.resolve(this.usuario);
  }
  actualizar(): Promise<UsuarioSinPassword> {
    throw new Error('no usado');
  }
  listar(): Promise<UsuarioSinPassword[]> {
    throw new Error('no usado');
  }
}

//registra lo que los casos de uso aportan a la bitácora
class ActividadEspia extends ContextoActividadPort {
  organismos: number[] = [];
  detalles: Record<string, unknown>[] = [];
  actor(): void {}
  entidad(): void {}
  cuentaMensual(): void {}
  organismo(id: number): void {
    this.organismos.push(id);
  }
  detalle(datos: Record<string, unknown>): void {
    this.detalles.push(datos);
  }
}

const organismo = (auditorId: number | null = null, active = true) =>
  new Organismo('Hospital', 'Salud', active, 5, new Date(), auditorId);
const usuario = (roles: Rol[], active = true): UsuarioSinPassword => ({
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  email: 'ana@example.com',
  active,
  roles,
  id: 9,
});

describe('AsignarAuditorUseCase', () => {
  const armar = (org: Organismo | null, usu: UsuarioSinPassword | null) => {
    const organismos = new OrganismosFalso(org);
    const actividad = new ActividadEspia();
    const casoDeUso = new AsignarAuditorUseCase(
      organismos,
      new UsuariosFalso(usu),
      actividad,
    );
    return { organismos, actividad, casoDeUso };
  };

  it('asigna el auditor y devuelve el organismo actualizado', async () => {
    const { organismos, casoDeUso } = armar(
      organismo(),
      usuario([Rol.AUDITOR]),
    );

    const resultado = await casoDeUso.execute(5, 9);

    expect(organismos.asignaciones).toEqual([9]);
    expect(resultado.auditorId).toBe(9);
  });

  it('reasignar reemplaza al anterior y deja ambos en el detalle de la bitácora', async () => {
    const { organismos, actividad, casoDeUso } = armar(
      organismo(3),
      usuario([Rol.AUDITOR]),
    );

    await casoDeUso.execute(5, 9);

    expect(organismos.asignaciones).toEqual([9]);
    expect(actividad.organismos).toEqual([5]);
    expect(actividad.detalles).toEqual([
      { auditorAnteriorId: 3, auditorNuevoId: 9 },
    ]);
  });

  it('404 si el organismo no existe, sin asignar', async () => {
    const { organismos, casoDeUso } = armar(null, usuario([Rol.AUDITOR]));

    await expect(casoDeUso.execute(5, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(organismos.asignaciones).toEqual([]);
  });

  it('409 si el organismo está inactivo', async () => {
    const { organismos, casoDeUso } = armar(
      organismo(null, false),
      usuario([Rol.AUDITOR]),
    );

    await expect(casoDeUso.execute(5, 9)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(organismos.asignaciones).toEqual([]);
  });

  it('404 si el usuario no existe', async () => {
    const { casoDeUso } = armar(organismo(), null);

    await expect(casoDeUso.execute(5, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    ['está inactivo', usuario([Rol.AUDITOR], false)],
    ['no tiene el rol AUDITOR', usuario([Rol.RESPONSABLE])],
    ['solo es JUEZ_TRAMITE', usuario([Rol.JUEZ_TRAMITE])],
  ])('409 si el usuario %s, sin asignar', async (_caso, usu) => {
    const { organismos, casoDeUso } = armar(organismo(), usu);

    await expect(casoDeUso.execute(5, 9)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(organismos.asignaciones).toEqual([]);
  });
});

describe('QuitarAuditorUseCase', () => {
  it('quita el auditor y deja el anterior en el detalle de la bitácora', async () => {
    const organismos = new OrganismosFalso(organismo(9));
    const actividad = new ActividadEspia();

    const resultado = await new QuitarAuditorUseCase(
      organismos,
      actividad,
    ).execute(5);

    expect(organismos.asignaciones).toEqual([null]);
    expect(resultado.auditorId).toBeNull();
    expect(actividad.detalles).toEqual([
      { auditorAnteriorId: 9, auditorNuevoId: null },
    ]);
  });

  it('404 si el organismo no existe', async () => {
    await expect(
      new QuitarAuditorUseCase(
        new OrganismosFalso(null),
        new ActividadEspia(),
      ).execute(5),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 si el organismo no tiene auditor', async () => {
    const organismos = new OrganismosFalso(organismo(null));

    await expect(
      new QuitarAuditorUseCase(organismos, new ActividadEspia()).execute(5),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(organismos.asignaciones).toEqual([]);
  });
});
