import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { AccesoCuentaService } from '../services/acceso-cuenta.service.js';
import { ResponsableDelOrganismoService } from '../services/responsable-del-organismo.service.js';
import { ListarCuentasMensualesUseCase } from './listar-cuentas-mensuales.use-case.js';

type Filtros = { estado?: EstadoCuentaMensual; organismoIds?: number[] };

class CuentasFalso extends CuentaMensualRepositoryPort {
  filtros: (Filtros | undefined)[] = [];

  existe(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<CuentaMensual | null> {
    throw new Error('no usado');
  }
  obtenerOrganismoId(): Promise<number | null> {
    throw new Error('no usado');
  }
  documentosFaltantes(): Promise<string[]> {
    throw new Error('no usado');
  }
  cambiarEstado(): Promise<boolean> {
    throw new Error('no usado');
  }
  presentar(): Promise<boolean> {
    throw new Error('no usado');
  }
  listar(filtros?: Filtros): Promise<CuentaMensualListada[]> {
    this.filtros.push(filtros);
    return Promise.resolve([]);
  }
}

class OrganismosFalso extends OrganismoRepositoryPort {
  crear(): Promise<Organismo> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<Organismo | null> {
    throw new Error('no usado');
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
  asignarAuditor(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarIdsPorAuditor(auditorId: number): Promise<number[]> {
    return Promise.resolve(auditorId === 1 ? [10, 12] : []);
  }
  esAuditorDelOrganismo(): Promise<boolean> {
    throw new Error('no usado');
  }
}

const armar = () => {
  const cuentas = new CuentasFalso();
  const casoDeUso = new ListarCuentasMensualesUseCase(
    cuentas,
    new AccesoCuentaService(
      new OrganismosFalso(),
      new ResponsableDelOrganismoService(undefined as never),
    ),
  );
  return { cuentas, casoDeUso };
};

describe('ListarCuentasMensualesUseCase', () => {
  it('un ADMIN ve todas: no se filtra por organismo y se respeta el estado', async () => {
    const { cuentas, casoDeUso } = armar();

    await casoDeUso.execute(
      { estado: EstadoCuentaMensual.LISTO_PARA_AUDITAR },
      { usuarioId: 1, roles: [Rol.ADMIN] },
    );

    expect(cuentas.filtros).toEqual([
      { estado: EstadoCuentaMensual.LISTO_PARA_AUDITAR },
    ]);
  });

  it('un AUDITOR solo ve las cuentas de los organismos que tiene asignados', async () => {
    const { cuentas, casoDeUso } = armar();

    await casoDeUso.execute({}, { usuarioId: 1, roles: [Rol.AUDITOR] });

    expect(cuentas.filtros).toEqual([{ organismoIds: [10, 12] }]);
  });

  it('un AUDITOR sin organismos asignados recibe una lista vacía sin consultar las cuentas', async () => {
    const { cuentas, casoDeUso } = armar();

    const resultado = await casoDeUso.execute(
      {},
      { usuarioId: 2, roles: [Rol.AUDITOR] },
    );

    expect(resultado).toEqual([]);
    expect(cuentas.filtros).toEqual([]);
  });
});
