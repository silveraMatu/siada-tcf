import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../usuarios/domain/entities/usuario.domain.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ListarAuditoresUseCase } from './listar-auditores.use-case.js';

const usuario = (id: number, roles: Rol[]): UsuarioSinPassword => ({
  nombre: `U${id}`,
  apellido: 'Prueba',
  dni: String(30000000 + id),
  email: `u${id}@example.com`,
  active: true,
  roles,
  id,
});

class UsuariosFalso extends UsuarioRepositoryPort {
  filtros: ({ active?: boolean } | undefined)[] = [];

  constructor(private readonly usuarios: UsuarioSinPassword[]) {
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
    throw new Error('no usado');
  }
  actualizar(): Promise<UsuarioSinPassword> {
    throw new Error('no usado');
  }
  listar(filtros?: { active?: boolean }): Promise<UsuarioSinPassword[]> {
    this.filtros.push(filtros);
    return Promise.resolve(this.usuarios);
  }
}

describe('ListarAuditoresUseCase', () => {
  it('pide solo los usuarios activos y se queda con los que tienen el rol AUDITOR', async () => {
    const usuarios = new UsuariosFalso([
      usuario(1, [Rol.AUDITOR]),
      usuario(2, [Rol.RESPONSABLE]),
      usuario(3, [Rol.JUEZ_TRAMITE, Rol.AUDITOR]),
      usuario(4, [Rol.ADMIN]),
    ]);

    const auditores = await new ListarAuditoresUseCase(usuarios).execute();

    expect(auditores.map((a) => a.id)).toEqual([1, 3]);
    expect(usuarios.filtros).toEqual([{ active: true }]);
  });
});
