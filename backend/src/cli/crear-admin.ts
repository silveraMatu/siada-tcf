import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { pathToFileURL } from 'node:url';
import { ZodError } from 'zod';
import { AppModule } from '../app.module.js';
import { RegistrarUsuarioUseCase } from '../modules/auth/application/use-cases/registrar-usuario.use-case.js';
import { RegistroSchema } from '../modules/auth/infrastructure/http/dto/registro.dto.js';
import { ActivarUsuarioYAsignarRolesUseCase } from '../modules/usuarios/application/use-cases/activar-usuario-y-asignar-roles.use-case.js';
import { UsuarioRepositoryPort } from '../modules/usuarios/application/ports/out/usuario-repository.port.js';
import { Rol } from '../modules/usuarios/domain/enums/rol.enum.js';

export type ResultadoCrearAdmin = 'creado' | 'promovido' | 'existente';

//crea un administrador activo; si el email ya está registrado lo promueve a ADMIN (sin cambiarle la contraseña)
export async function crearAdmin(
  app: INestApplicationContext,
  entrada: Record<string, unknown>,
): Promise<ResultadoCrearAdmin> {
  const datos = RegistroSchema.parse(entrada);
  const usuarios = app.get(UsuarioRepositoryPort, { strict: false });
  const activar = app.get(ActivarUsuarioYAsignarRolesUseCase, {
    strict: false,
  });

  const existente = await usuarios.buscarPorEmail(datos.email);
  if (existente) {
    if (existente.active && existente.roles.includes(Rol.ADMIN)) {
      return 'existente';
    }
    const roles = [...new Set([...existente.roles, Rol.ADMIN])];
    await activar.execute(existente.id!, true, roles);
    return 'promovido';
  }

  const registrar = app.get(RegistrarUsuarioUseCase, { strict: false });
  const usuario = await registrar.execute(datos);
  await activar.execute(usuario.id!, true, [Rol.ADMIN]);
  return 'creado';
}

function leerEntorno(): Record<string, string> {
  const claves = {
    email: 'ADMIN_EMAIL',
    password: 'ADMIN_PASSWORD',
    dni: 'ADMIN_DNI',
    nombre: 'ADMIN_NOMBRE',
    apellido: 'ADMIN_APELLIDO',
  };
  const faltan = Object.values(claves).filter((nombre) => !process.env[nombre]);
  if (faltan.length) {
    throw new Error(`Faltan las variables de entorno: ${faltan.join(', ')}`);
  }
  return Object.fromEntries(
    Object.entries(claves).map(([campo, nombre]) => [
      campo,
      process.env[nombre]!,
    ]),
  );
}

async function main(): Promise<void> {
  const entrada = leerEntorno();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const resultado = await crearAdmin(app, entrada);
    const mensajes: Record<ResultadoCrearAdmin, string> = {
      creado: 'Administrador creado',
      promovido: 'El usuario ya existía: ahora es administrador activo',
      existente:
        'Ya existe un administrador activo con ese email: no se cambió nada',
    };
    console.log(`${mensajes[resultado]} (${entrada.email})`);
  } finally {
    await app.close();
  }
}

//solo corre al ejecutarlo directamente (node dist/cli/crear-admin.js), no al importarlo desde los tests
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
