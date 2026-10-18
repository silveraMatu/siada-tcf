import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';

//compartido por los e2e de varios modulos; los datos no se limpian, por eso todo es idempotente

export const ID_INEXISTENTE = 999999;

export const EJERCICIO = 2026;
export const MES_CON_LIBRO = 3;
export const MES_SIN_LIBRO = 12; //reservado: nunca se ingesta ningun libro en este mes

//organismo inicial que usan los e2e de cuentas, libro-banco y responsables
export async function obtenerOrganismoBaseId(
  dataSource: DataSource,
): Promise<number> {
  const nombre = '__E2E__ Organismo Base';
  const existente = await dataSource.query(
    `SELECT id FROM organismos WHERE nombre = $1 LIMIT 1`,
    [nombre],
  );
  if (existente.length) return existente[0].id;

  const [creado] = await dataSource.query(
    `INSERT INTO organismos (nombre, rubro, active) VALUES ($1, 'E2E', true) RETURNING id`,
    [nombre],
  );
  return creado.id;
}

//resuelve (obtiene o crea) la cuenta mensual por el endpoint y devuelve su id
export async function resolverCuentaMensualId(
  app: INestApplication,
  organismoId: number,
  mes: number,
): Promise<number> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/cuentas-mensuales/resolver')
    .send({ organismoId, ejercicioFiscal: EJERCICIO, mes })
    .expect(200);
  return res.body.id;
}

//DNI de 8 digitos unicos: parten del maximo guardado y avanzan de a uno (al azar acabarian chocando)
let proximoDni: number | null = null;

export async function inicializarDnis(dataSource: DataSource): Promise<void> {
  if (proximoDni !== null) return;
  const [{ maximo }] = await dataSource.query(
    `SELECT COALESCE(MAX(dni::bigint), 0) AS maximo FROM usuarios WHERE dni ~ '^[0-9]{8}$'`,
  );
  proximoDni = Math.max(Number(maximo) + 1, 10_000_000);
}

export function dniNuevo(): string {
  if (proximoDni === null)
    throw new Error(
      'Llamar a inicializarDnis(dataSource) antes de generar DNI',
    );
  return String(proximoDni++);
}

//DNI de 7 digitos sin usar (dniNuevo genera siempre de 8)
export async function dniDeSieteDigitosLibre(
  dataSource: DataSource,
): Promise<string> {
  for (let intento = 0; intento < 50; intento++) {
    const dni = String(1_000_000 + Math.floor(Math.random() * 9_000_000));
    const ocupado = await dataSource.query(
      `SELECT 1 FROM usuarios WHERE dni = $1`,
      [dni],
    );
    if (!ocupado.length) return dni;
  }
  throw new Error('No se encontro un DNI de 7 digitos libre');
}

export const PASSWORD_FIXTURE = 'clave-segura-123';

//registra un usuario por el endpoint publico (nace inactivo y sin roles) con email y DNI unicos
export async function registrarUsuarioConCredenciales(
  app: INestApplication,
): Promise<{ id: number; email: string; password: string }> {
  await inicializarDnis(app.get(DataSource));
  const sufijo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-fixture-${sufijo}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/registro')
    .send({
      nombre: 'Fixture',
      apellido: 'E2E',
      email,
      dni: dniNuevo(),
      password: PASSWORD_FIXTURE,
    })
    .expect(201);
  return { id: res.body.id, email, password: PASSWORD_FIXTURE };
}

export async function registrarUsuario(app: INestApplication): Promise<number> {
  return (await registrarUsuarioConCredenciales(app)).id;
}

//admin de pruebas: se crea una vez (find-or-create) y los tests nunca lo modifican
export const EMAIL_ADMIN = 'e2e-admin@example.com';
export const PASSWORD_ADMIN = 'clave-admin-123';
let bearerAdmin: string | null = null;

//header Authorization de un ADMIN: lo crea directo en la base y obtiene su token por POST /auth/login
export async function obtenerBearerAdmin(
  app: INestApplication,
): Promise<string> {
  if (bearerAdmin) return bearerAdmin;
  const dataSource = app.get(DataSource);
  await inicializarDnis(dataSource);
  await dataSource.query(
    `INSERT INTO usuarios (nombre, apellido, dni, email, password, active, roles)
     VALUES ('Admin', 'E2E', $1, $2, $3, true, '{ADMIN}') ON CONFLICT DO NOTHING`,
    [dniNuevo(), EMAIL_ADMIN, await bcrypt.hash(PASSWORD_ADMIN, 4)],
  );
  await dataSource.query(
    `UPDATE usuarios SET active = true, roles = '{ADMIN}' WHERE email = $1`,
    [EMAIL_ADMIN],
  );

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN })
    .expect(200);
  bearerAdmin = `Bearer ${res.body.accessToken}`;
  return bearerAdmin;
}

//activa un usuario y le asigna roles por el endpoint administrativo
export async function habilitarUsuario(
  app: INestApplication,
  usuarioId: number,
  roles: string[],
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/api/v1/usuarios/${usuarioId}/activar`)
    .set('Authorization', await obtenerBearerAdmin(app))
    .send({ active: true, roles })
    .expect(200);
}

//usuario activo con el rol RESPONSABLE, listo para crearle su perfil de responsable
export async function crearUsuarioResponsable(
  app: INestApplication,
): Promise<number> {
  const usuarioId = await registrarUsuario(app);
  await habilitarUsuario(app, usuarioId, ['RESPONSABLE']);
  return usuarioId;
}
