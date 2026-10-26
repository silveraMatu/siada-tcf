import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';

//compartido por los e2e de varios modulos; los datos no se limpian, por eso todo es idempotente

export const ID_INEXISTENTE = 999999;

export const EJERCICIO = 2026;
export const MES_CON_LIBRO = 3;
export const MES_SIN_LIBRO = 12; //reservado: nunca se ingesta ningun libro en este mes
export const MES_PRESENTAR = 10; //reservado: los specs de presentar y del candado lo vuelven a EN_BORRADOR al empezar
export const MES_AUDITORIA = 11; //reservado para auditoria: un unico libro con un saldo equivocado
export const MES_INGRESOS_EGRESOS = 9; //reservado para el e2e de ingresos-egresos: se vuelve a EN_BORRADOR al empezar
export const MES_PRESENTAR_INCOMPLETA = 7; //reservado: solo recibe el libro banco, así que presentar siempre falla por falta de Ingresos y Egresos
export const MES_AUDITORIA_CRUCE = 8; //reservado para auditoria: banco e ingresos y egresos con fallos sembrados
export const MES_BITACORA = 5; //reservado para el e2e de la bitacora: carga dos libros y presenta; se vuelve a EN_BORRADOR al empezar
export const MES_AUDITORIA_VACIA = 4; //reservado para auditoria: presentada por SQL y sin ningun libro
export const MES_AUDITORIA_BORRADOR = 6; //reservado para auditoria: los rechazos por estado (borrador y cerrada)

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
//lo hace un ADMIN, que puede resolver la cuenta de cualquier organismo
export async function resolverCuentaMensualId(
  app: INestApplication,
  organismoId: number,
  mes: number,
): Promise<number> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/cuentas-mensuales/resolver')
    .set('Authorization', await obtenerBearerAdmin(app))
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

//segundo organismo (find-or-create) para probar que un responsable no toca cuentas ajenas
export async function obtenerOrganismoAjenoId(
  dataSource: DataSource,
): Promise<number> {
  const nombre = '__E2E__ Organismo Ajeno';
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

//responsable nuevo (usuario RESPONSABLE activo) vinculado al organismo, ya con sesion iniciada
export async function crearResponsableConSesion(
  app: INestApplication,
  organismoId: number,
): Promise<{ bearer: string; usuarioId: number; responsableId: number }> {
  const {
    id: usuarioId,
    email,
    password,
  } = await registrarUsuarioConCredenciales(app);
  await habilitarUsuario(app, usuarioId, ['RESPONSABLE']);
  const responsable = await request(app.getHttpServer())
    .post('/api/v1/responsables')
    .set('Authorization', await obtenerBearerAdmin(app))
    .send({ usuarioId })
    .expect(201);
  await app
    .get(DataSource)
    .query(`UPDATE responsables SET organismo_id = $1 WHERE id = $2`, [
      organismoId,
      responsable.body.id,
    ]);
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    bearer: `Bearer ${login.body.accessToken}`,
    usuarioId,
    responsableId: responsable.body.id,
  };
}

//usuario nuevo y activo con un solo rol (sin perfil de responsable), ya con sesion iniciada
export async function crearSesionConRol(
  app: INestApplication,
  rol: 'ADMIN' | 'JUEZ_TRAMITE' | 'AUDITOR' | 'RESPONSABLE' | 'SUPERVISOR',
): Promise<string> {
  const { id, email, password } = await registrarUsuarioConCredenciales(app);
  await habilitarUsuario(app, id, [rol]);
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return `Bearer ${login.body.accessToken}`;
}

//carga un libro con la sesion del responsable de la cuenta; `reemplazar` lo vuelve repetible entre ejecuciones
export async function cargarLibro(
  app: INestApplication,
  bearerResponsable: string,
  cuentaMensualId: number,
  numeroCuentaCte = 'E2E/BASE',
): Promise<{ id: number }> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/cuentas-mensuales/${cuentaMensualId}/libro-banco/ingestar`)
    .set('Authorization', bearerResponsable)
    .send({
      numeroCuentaCte,
      reemplazar: true,
      //fechas fuera de orden a propósito: el resumen toma la mínima y la máxima, no la primera y la última fila
      transacciones: [
        {
          fecha: '2026-03-10',
          aLaOrdenDe: 'Proveedor E2E',
          depositos: 0,
          retiro: 10,
          saldo: 90,
        },
        {
          fecha: '2026-03-02',
          aLaOrdenDe: 'Cliente E2E',
          depositos: 5,
          retiro: 0,
          saldo: 95,
        },
      ],
    })
    .expect(201);
  return res.body;
}

//carga el libro de Ingresos y Egresos de la rendición (reemplaza el que haya) como responsable del organismo
export async function cargarIngresosEgresos(
  app: INestApplication,
  bearerResponsable: string,
  cuentaMensualId: number,
): Promise<void> {
  await request(app.getHttpServer())
    .post(
      `/api/v1/cuentas-mensuales/${cuentaMensualId}/ingresos-egresos/ingestar`,
    )
    .set('Authorization', bearerResponsable)
    .send({
      reemplazar: true,
      transacciones: [
        {
          fila: 4,
          fecha: '2026-03-02',
          concepto: 'Saldo inicial E2E',
          cajaDebe: 0,
          cajaHaber: 0,
          cajaSaldo: 100,
          bancoDebe: 0,
          bancoHaber: 0,
          bancoSaldo: 90,
          egresoInc1: 0,
          egresoInc2: 0,
          egresoInc3: 0,
          egresoInc4: 0,
          egresoInc5: 0,
          ingresoMunicipal: 0,
          ingresoOtras: 0,
          cuentasVariasDebe: 0,
          cuentasVariasHaber: 0,
        },
      ],
    })
    .expect(201);
}

//deja la cuenta en el estado indicado (por defecto EN_BORRADOR): la presentacion no se puede deshacer por la API
export async function fijarEstadoCuenta(
  dataSource: DataSource,
  cuentaMensualId: number,
  estado = 'EN_BORRADOR',
): Promise<void> {
  await dataSource.query(
    `UPDATE cuentas_mensuales SET estado = $1 WHERE id = $2`,
    [estado, cuentaMensualId],
  );
}

//usuario AUDITOR activo con sesión iniciada; con `organismoId` queda asignado como el auditor de ese organismo
//(un organismo tiene un solo auditor a la vez: asignar otro reemplaza al anterior)
export async function crearAuditorConSesion(
  app: INestApplication,
  organismoId?: number,
): Promise<{ bearer: string; usuarioId: number }> {
  const { id, email, password } = await registrarUsuarioConCredenciales(app);
  await habilitarUsuario(app, id, ['AUDITOR']);
  if (organismoId !== undefined) {
    await asignarAuditor(app, organismoId, id);
  }
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return { bearer: `Bearer ${login.body.accessToken}`, usuarioId: id };
}

//lo hace un ADMIN, que también puede asignar auditores
export async function asignarAuditor(
  app: INestApplication,
  organismoId: number,
  auditorId: number,
): Promise<void> {
  await request(app.getHttpServer())
    .put(`/api/v1/organismos/${organismoId}/auditor`)
    .set('Authorization', await obtenerBearerAdmin(app))
    .send({ auditorId })
    .expect(200);
}

//deja la rendición lista para volver a auditarla: sin ejecuciones (las observaciones caen con ellas) y en el estado indicado
export async function reiniciarAuditoria(
  dataSource: DataSource,
  cuentaMensualId: number,
  estado = 'LISTO_PARA_AUDITAR',
): Promise<void> {
  await dataSource.query(
    `DELETE FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1`,
    [cuentaMensualId],
  );
  await fijarEstadoCuenta(dataSource, cuentaMensualId, estado);
}
