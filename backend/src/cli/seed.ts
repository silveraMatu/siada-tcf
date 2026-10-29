import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { pathToFileURL } from 'node:url';
import { ZodError } from 'zod';
import { AppModule } from '../app.module.js';
import { RegistrarUsuarioUseCase } from '../modules/auth/application/use-cases/registrar-usuario.use-case.js';
import { RegistroSchema } from '../modules/auth/infrastructure/http/dto/registro.dto.js';
import { CuentaMensualRepositoryPort } from '../modules/cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { PresentarCuentaMensualUseCase } from '../modules/cuentas/application/use-cases/presentar-cuenta-mensual.use-case.js';
import { ResolverCuentaMensualUseCase } from '../modules/cuentas/application/use-cases/resolver-cuenta-mensual.use-case.js';
import { EstadoCuentaMensual } from '../modules/cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { IngestarIngresosEgresosUseCase } from '../modules/ingresos-egresos/application/use-cases/ingestar-ingresos-egresos.use-case.js';
import { IngestarLibroBancoUseCase } from '../modules/libro-banco/application/use-cases/ingestar-libro-banco.use-case.js';
import { OrganismoRepositoryPort } from '../modules/organismos/application/ports/out/organismo-repository.port.js';
import { AsignarAuditorUseCase } from '../modules/organismos/application/use-cases/asignar-auditor.use-case.js';
import { CrearOrganismoUseCase } from '../modules/organismos/application/use-cases/crear-organismo.use-case.js';
import { ResponsableRepositoryPort } from '../modules/responsables/application/ports/out/responsable-repository.port.js';
import { AsignarOrganismoAResponsableUseCase } from '../modules/responsables/application/use-cases/asignar-organismo.use-case.js';
import { CrearResponsableUseCase } from '../modules/responsables/application/use-cases/crear-responsable.use-case.js';
import { UsuarioRepositoryPort } from '../modules/usuarios/application/ports/out/usuario-repository.port.js';
import { ActivarUsuarioYAsignarRolesUseCase } from '../modules/usuarios/application/use-cases/activar-usuario-y-asignar-roles.use-case.js';
import type { Usuario } from '../modules/usuarios/domain/entities/usuario.domain.js';
import { Rol } from '../modules/usuarios/domain/enums/rol.enum.js';
import { EJERCICIO_SEED, mesesDelSeed } from './seed-datos.js';

//datos de desarrollo con una clave conocida: nunca se siembran en producción
export const CLAVE_SEED = 'siada123';
export const NOMBRE_ORGANISMO_SEED = 'Municipalidad Demo (seed)';

//un usuario por rol; el administrador lo crea `npm run crear-admin`
export const USUARIOS_SEED = [
  {
    rol: Rol.RESPONSABLE,
    nombre: 'Rosa',
    apellido: 'Responsable',
    dni: '90000001',
    email: 'seed.responsable@siada.dev',
  },
  {
    rol: Rol.AUDITOR,
    nombre: 'Aldo',
    apellido: 'Auditor',
    dni: '90000002',
    email: 'seed.auditor@siada.dev',
  },
  {
    rol: Rol.JUEZ_TRAMITE,
    nombre: 'Julia',
    apellido: 'Juez',
    dni: '90000003',
    email: 'seed.juez@siada.dev',
  },
  {
    rol: Rol.SUPERVISOR,
    nombre: 'Sergio',
    apellido: 'Supervisor',
    dni: '90000004',
    email: 'seed.supervisor@siada.dev',
  },
] as const;

export interface ResultadoSeed {
  organismoId: number;
  usuarios: { rol: Rol; email: string; id: number }[];
  meses: {
    mes: number;
    cuentaId: number;
    descripcion: string;
    accion: string;
  }[];
}

//deja la base lista para probar el flujo completo; se puede repetir sin duplicar nada
export async function sembrar(
  app: INestApplicationContext,
): Promise<ResultadoSeed> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'El seed crea usuarios con una clave conocida: no corre en producción',
    );
  }
  const get = <T>(token: abstract new (...args: never[]) => T): T =>
    app.get(token, { strict: false });

  const usuarios = get(UsuarioRepositoryPort);
  const registrar = get(RegistrarUsuarioUseCase);
  const activar = get(ActivarUsuarioYAsignarRolesUseCase);

  const usuariosCreados: ResultadoSeed['usuarios'] = [];
  for (const datos of USUARIOS_SEED) {
    const entrada = RegistroSchema.parse({ ...datos, password: CLAVE_SEED });
    const usuario: Pick<Usuario, 'id' | 'active' | 'roles'> =
      (await usuarios.buscarPorEmail(entrada.email)) ??
      (await registrar.execute(entrada));
    if (!usuario.active || !usuario.roles.includes(datos.rol)) {
      await activar.execute(usuario.id!, true, [datos.rol]);
    }
    usuariosCreados.push({
      rol: datos.rol,
      email: entrada.email,
      id: usuario.id!,
    });
  }
  const idDe = (rol: Rol) => usuariosCreados.find((u) => u.rol === rol)!.id;

  const organismos = get(OrganismoRepositoryPort);
  const organismo =
    (await organismos.buscarTodos()).find(
      (o) => o.nombre === NOMBRE_ORGANISMO_SEED,
    ) ??
    (await get(CrearOrganismoUseCase).execute(
      NOMBRE_ORGANISMO_SEED,
      'Municipalidad',
    ));
  const organismoId = organismo.id!;

  const responsables = get(ResponsableRepositoryPort);
  const responsable =
    (await responsables.buscarPorUsuarioId(idDe(Rol.RESPONSABLE))) ??
    (await get(CrearResponsableUseCase).execute(idDe(Rol.RESPONSABLE)));
  if (responsable.organismoId !== organismoId) {
    await get(AsignarOrganismoAResponsableUseCase).execute(
      responsable.id!,
      organismoId,
    );
  }

  if (organismo.auditorId !== idDe(Rol.AUDITOR)) {
    await get(AsignarAuditorUseCase).execute(organismoId, idDe(Rol.AUDITOR));
  }

  const resolver = get(ResolverCuentaMensualUseCase);
  const cuentas = get(CuentaMensualRepositoryPort);
  const ingestarBanco = get(IngestarLibroBancoUseCase);
  const ingestarIE = get(IngestarIngresosEgresosUseCase);
  const presentar = get(PresentarCuentaMensualUseCase);
  const responsableUsuarioId = idDe(Rol.RESPONSABLE);

  const meses: ResultadoSeed['meses'] = [];
  for (const { mes, descripcion, objetivo, rendicion } of mesesDelSeed(
    EJERCICIO_SEED,
  )) {
    const cuenta = await resolver.execute(organismoId, EJERCICIO_SEED, mes, {
      usuarioId: responsableUsuarioId,
      esAdmin: false,
    });
    const cuentaId = cuenta.id!;

    //una vez presentada la evidencia es inmutable: no se toca
    if (
      (await cuentas.buscarPorId(cuentaId))?.estado !==
      EstadoCuentaMensual.EN_BORRADOR
    ) {
      meses.push({
        mes,
        cuentaId,
        descripcion,
        accion: 'ya presentada, sin cambios',
      });
      continue;
    }

    for (const libro of rendicion.librosBanco) {
      await ingestarBanco.execute(
        cuentaId,
        { ...libro, reemplazar: true },
        responsableUsuarioId,
      );
    }
    await ingestarIE.execute(
      cuentaId,
      { ...rendicion.ingresosEgresos, reemplazar: true },
      responsableUsuarioId,
    );
    if (objetivo === 'PRESENTADA') {
      await presentar.execute(cuentaId, responsableUsuarioId);
    }
    meses.push({
      mes,
      cuentaId,
      descripcion,
      accion:
        objetivo === 'PRESENTADA'
          ? 'libros cargados y presentada'
          : 'libros cargados, en borrador',
    });
  }

  return { organismoId, usuarios: usuariosCreados, meses };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const resultado = await sembrar(app);
    console.log(
      `Organismo «${NOMBRE_ORGANISMO_SEED}» (id ${resultado.organismoId}), ejercicio ${EJERCICIO_SEED}`,
    );
    console.log(`Usuarios (clave de todos: ${CLAVE_SEED}):`);
    for (const u of resultado.usuarios)
      console.log(`  ${u.rol.padEnd(13)} ${u.email}`);
    console.log('Rendiciones:');
    for (const m of resultado.meses) {
      console.log(
        `  mes ${m.mes} (cuenta ${m.cuentaId}): ${m.descripcion} → ${m.accion}`,
      );
    }
    console.log('El administrador se crea con `npm run crear-admin`.');
  } finally {
    await app.close();
  }
}

//solo corre al ejecutarlo directamente (node dist/cli/seed.js), no al importarlo desde los tests
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    if (error instanceof ZodError) {
      console.error('Datos inválidos:');
      for (const issue of error.issues) {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  });
}
