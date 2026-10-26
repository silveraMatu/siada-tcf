import { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from './acceso-cuenta.service.js';
import { ResponsableDelOrganismoService } from './responsable-del-organismo.service.js';

const ORGANISMO = 10;
const OTRO_ORGANISMO = 11;
const USUARIO = 77;

//el auditor tiene asignado el organismo 10 y nada más
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
    return Promise.resolve(auditorId === USUARIO ? [ORGANISMO] : []);
  }
  esAuditorDelOrganismo(
    auditorId: number,
    organismoId: number,
  ): Promise<boolean> {
    return Promise.resolve(auditorId === USUARIO && organismoId === ORGANISMO);
  }
}

//el responsable es del organismo 10
class ResponsablesFalso extends ResponsableDelOrganismoService {
  constructor() {
    super(undefined as never);
  }
  override esResponsableDelOrganismo(
    usuarioId: number,
    organismoId: number | null,
  ): Promise<boolean> {
    return Promise.resolve(usuarioId === USUARIO && organismoId === ORGANISMO);
  }
}

const servicio = new AccesoCuentaService(
  new OrganismosFalso(),
  new ResponsablesFalso(),
);
const actor = (...roles: Rol[]): ActorAcceso => ({ usuarioId: USUARIO, roles });

describe('AccesoCuentaService', () => {
  describe('puedeLeer', () => {
    it('un ADMIN puede leer cualquier organismo', async () => {
      expect(await servicio.puedeLeer(actor(Rol.ADMIN), OTRO_ORGANISMO)).toBe(
        true,
      );
    });

    it('un AUDITOR solo lee los organismos que tiene asignados', async () => {
      expect(await servicio.puedeLeer(actor(Rol.AUDITOR), ORGANISMO)).toBe(
        true,
      );
      expect(await servicio.puedeLeer(actor(Rol.AUDITOR), OTRO_ORGANISMO)).toBe(
        false,
      );
    });

    it('un RESPONSABLE solo lee el organismo del que es responsable', async () => {
      expect(await servicio.puedeLeer(actor(Rol.RESPONSABLE), ORGANISMO)).toBe(
        true,
      );
      expect(
        await servicio.puedeLeer(actor(Rol.RESPONSABLE), OTRO_ORGANISMO),
      ).toBe(false);
    });

    it('con más de un rol alcanza con que alguno dé acceso', async () => {
      expect(
        await servicio.puedeLeer(
          actor(Rol.AUDITOR, Rol.RESPONSABLE),
          ORGANISMO,
        ),
      ).toBe(true);
    });

    it('ser auditor de un organismo no da acceso si el usuario no tiene el rol AUDITOR', async () => {
      expect(await servicio.puedeLeer(actor(Rol.JUEZ_TRAMITE), ORGANISMO)).toBe(
        false,
      );
      expect(await servicio.puedeLeer(actor(Rol.SUPERVISOR), ORGANISMO)).toBe(
        false,
      );
      expect(await servicio.puedeLeer(actor(), ORGANISMO)).toBe(false);
    });

    it('sin organismo no hay acceso ni para un ADMIN', async () => {
      expect(await servicio.puedeLeer(actor(Rol.ADMIN), null)).toBe(false);
    });
  });

  describe('organismosVisibles', () => {
    it('ADMIN: todos (null)', async () => {
      expect(await servicio.organismosVisibles(actor(Rol.ADMIN))).toBeNull();
    });

    it('AUDITOR: los organismos que tiene asignados', async () => {
      expect(await servicio.organismosVisibles(actor(Rol.AUDITOR))).toEqual([
        ORGANISMO,
      ]);
    });

    it('un AUDITOR sin asignaciones no ve ninguno', async () => {
      expect(
        await servicio.organismosVisibles({
          usuarioId: 999,
          roles: [Rol.AUDITOR],
        }),
      ).toEqual([]);
    });

    it('otros roles no ven ninguno en un listado', async () => {
      expect(await servicio.organismosVisibles(actor(Rol.RESPONSABLE))).toEqual(
        [],
      );
    });
  });
});
