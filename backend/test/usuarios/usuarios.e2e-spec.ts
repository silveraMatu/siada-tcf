import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  dniNuevo,
  ID_INEXISTENTE,
  inicializarDnis,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  //cada usuario usa email y DNI propios de la corrida para que los tests sean idempotentes
  const base = Date.now() % 1_000_000_000;
  let contador = 0;

  //registra un usuario por el endpoint publico: nace inactivo y sin roles
  const registrarUsuario = async (): Promise<{ id: number; email: string }> => {
    contador += 1;
    const email = `e2e-usuarios-${base}-${contador}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/registro')
      .send({
        nombre: 'Admin',
        apellido: 'Panel',
        email,
        dni: dniNuevo(),
        password: 'clave-segura-123',
      })
      .expect(201);
    return { id: res.body.id, email };
  };

  const listar = (query = '') =>
    request(app.getHttpServer()).get(`/api/v1/usuarios${query}`);
  const activar = (id: number | string, body: unknown) =>
    request(app.getHttpServer())
      .patch(`/api/v1/usuarios/${id}/activar`)
      .send(body as object);
  const filaDe = async (id: number) =>
    (await dataSource.query(`SELECT * FROM usuarios WHERE id = $1`, [id]))[0];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await inicializarDnis(dataSource);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('GET /usuarios', () => {
    let pendienteId: number;
    let habilitadoId: number;

    beforeAll(async () => {
      pendienteId = (await registrarUsuario()).id;
      habilitadoId = (await registrarUsuario()).id;
      await activar(habilitadoId, { active: true, roles: ['AUDITOR'] }).expect(
        200,
      );
    });

    const ids = (body: { id: number }[]) => body.map((u) => u.id);

    it('200: devuelve todos los usuarios con el contrato de respuesta, sin password y ordenados por id', async () => {
      const res = await listar().expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(ids(res.body)).toEqual(
        expect.arrayContaining([pendienteId, habilitadoId]),
      );
      for (const usuario of res.body) {
        expect(usuario).toEqual({
          id: expect.any(Number),
          nombre: expect.any(String),
          apellido: expect.any(String),
          dni: expect.any(String),
          email: expect.any(String),
          active: expect.any(Boolean),
          roles: expect.any(Array),
          fechaCreacion: expect.any(String),
        });
      }
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('$2b$');

      const lista = ids(res.body);
      expect(lista).toEqual([...lista].sort((a, b) => a - b));
    });

    it('200: ?active=false devuelve solo los inactivos (incluye al pendiente, excluye al habilitado)', async () => {
      const res = await listar('?active=false').expect(200);

      expect(
        res.body.every((u: { active: boolean }) => u.active === false),
      ).toBe(true);
      expect(ids(res.body)).toContain(pendienteId);
      expect(ids(res.body)).not.toContain(habilitadoId);

      const [{ total }] = await dataSource.query(
        `SELECT COUNT(*)::int AS total FROM usuarios WHERE active = false`,
      );
      expect(res.body).toHaveLength(total);
    });

    it('200: ?active=true devuelve solo los activos, todos con al menos un rol', async () => {
      const res = await listar('?active=true').expect(200);

      expect(
        res.body.every((u: { active: boolean }) => u.active === true),
      ).toBe(true);
      expect(
        res.body.every((u: { roles: string[] }) => u.roles.length > 0),
      ).toBe(true);
      expect(ids(res.body)).toContain(habilitadoId);
      expect(ids(res.body)).not.toContain(pendienteId);
    });

    it.each([['abc'], ['1'], ['0'], ['TRUE'], ['']])(
      '400: ?active=%s no es un booleano válido',
      async (valor) => {
        await listar(`?active=${valor}`).expect(400);
      },
    );
  });

  describe('PATCH /usuarios/:id/activar', () => {
    it('200: activa al usuario y le asigna roles (respuesta y BD), sin tocar la contraseña', async () => {
      const { id, email } = await registrarUsuario();
      const antes = await filaDe(id);
      expect(antes).toMatchObject({ active: false, roles: '{}' });

      const res = await activar(id, {
        active: true,
        roles: ['AUDITOR', 'JUEZ_TRAMITE'],
      }).expect(200);

      expect(res.body).toEqual({
        id,
        nombre: 'Admin',
        apellido: 'Panel',
        dni: expect.any(String),
        email,
        active: true,
        roles: ['AUDITOR', 'JUEZ_TRAMITE'],
        fechaCreacion: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toContain('password');

      const despues = await filaDe(id);
      expect(despues).toMatchObject({
        active: true,
        roles: '{AUDITOR,JUEZ_TRAMITE}',
      });
      expect(despues.password).toBe(antes.password);
    });

    it('200: los roles reemplazan a los anteriores (no se suman)', async () => {
      const { id } = await registrarUsuario();
      await activar(id, { active: true, roles: ['AUDITOR'] }).expect(200);

      const res = await activar(id, {
        active: true,
        roles: ['ADMIN'],
      }).expect(200);

      expect(res.body.roles).toEqual(['ADMIN']);
    });

    it('200: elimina roles repetidos', async () => {
      const { id } = await registrarUsuario();
      const res = await activar(id, {
        active: true,
        roles: ['ADMIN', 'ADMIN', 'AUDITOR', 'ADMIN'],
      }).expect(200);

      expect(res.body.roles).toEqual(['ADMIN', 'AUDITOR']);
    });

    it('200: es idempotente', async () => {
      const { id } = await registrarUsuario();
      const cuerpo = { active: true, roles: ['RESPONSABLE'] };

      const primera = await activar(id, cuerpo).expect(200);
      const segunda = await activar(id, cuerpo).expect(200);

      expect(segunda.body).toEqual(primera.body);
    });

    it('200: desactiva a un usuario activo, con o sin roles', async () => {
      const { id } = await registrarUsuario();
      await activar(id, { active: true, roles: ['ADMIN'] }).expect(200);

      const conRoles = await activar(id, {
        active: false,
        roles: ['ADMIN'],
      }).expect(200);
      expect(conRoles.body).toMatchObject({ active: false, roles: ['ADMIN'] });

      const sinRoles = await activar(id, { active: false, roles: [] }).expect(
        200,
      );
      expect(sinRoles.body).toMatchObject({ active: false, roles: [] });
    });

    it('400: no permite activar a un usuario sin roles y no modifica nada', async () => {
      const { id } = await registrarUsuario();

      const res = await activar(id, { active: true, roles: [] }).expect(400);

      expect(JSON.stringify(res.body)).toContain('al menos un rol');
      expect(await filaDe(id)).toMatchObject({ active: false, roles: '{}' });
    });

    it('400: no permite dejar sin roles a un usuario que sigue activo', async () => {
      const { id } = await registrarUsuario();
      await activar(id, { active: true, roles: ['ADMIN'] }).expect(200);

      await activar(id, { active: true, roles: [] }).expect(400);

      expect(await filaDe(id)).toMatchObject({
        active: true,
        roles: '{ADMIN}',
      });
    });

    it('400 (no 404): activar sin roles se rechaza antes de buscar al usuario', async () => {
      await activar(ID_INEXISTENTE, { active: true, roles: [] }).expect(400);
    });

    it('404: el usuario no existe', async () => {
      await activar(ID_INEXISTENTE, { active: true, roles: ['ADMIN'] }).expect(
        404,
      );
    });

    it.each([
      ['id no numerico', 'abc', { active: true, roles: ['ADMIN'] }],
      ['id cero', 0, { active: true, roles: ['ADMIN'] }],
      ['id negativo', -1, { active: true, roles: ['ADMIN'] }],
      ['id decimal', 1.5, { active: true, roles: ['ADMIN'] }],
      [
        'id fuera de rango int4',
        99999999999,
        { active: true, roles: ['ADMIN'] },
      ],
      ['body vacio', 1, {}],
      ['sin active', 1, { roles: ['ADMIN'] }],
      ['sin roles', 1, { active: true }],
      ['active como string', 1, { active: 'true', roles: ['ADMIN'] }],
      ['active nulo', 1, { active: null, roles: ['ADMIN'] }],
      ['rol inexistente', 1, { active: true, roles: ['SUPERADMIN'] }],
      ['rol en minusculas', 1, { active: true, roles: ['admin'] }],
      ['roles no es un arreglo', 1, { active: true, roles: 'ADMIN' }],
      ['roles con un valor no string', 1, { active: true, roles: [1] }],
    ])('400: %s', async (_caso, id, body) => {
      await activar(id, body).expect(400);
    });
  });

  describe('restriccion de la base: un usuario activo debe tener al menos un rol', () => {
    it('rechaza activar un usuario sin roles aunque se salte la API', async () => {
      const { id } = await registrarUsuario();

      await expect(
        dataSource.query(`UPDATE usuarios SET active = true WHERE id = $1`, [
          id,
        ]),
      ).rejects.toThrow(/CHK_usuarios_activo_con_rol/);
      expect(await filaDe(id)).toMatchObject({ active: false });
    });

    it('rechaza quitarle todos los roles a un usuario activo aunque se salte la API', async () => {
      const { id } = await registrarUsuario();
      await activar(id, { active: true, roles: ['ADMIN'] }).expect(200);

      await expect(
        dataSource.query(`UPDATE usuarios SET roles = '{}' WHERE id = $1`, [
          id,
        ]),
      ).rejects.toThrow(/CHK_usuarios_activo_con_rol/);
      expect(await filaDe(id)).toMatchObject({
        active: true,
        roles: '{ADMIN}',
      });
    });
  });
  describe('indice unico de email sin distinguir mayusculas', () => {
    const NOMBRE_INDICE = 'UQ_usuarios_email_lower';
    const insertarDirecto = (email: string) =>
      dataSource.query(
        `INSERT INTO usuarios (nombre, apellido, dni, email, password) VALUES ('Directo', 'E2E', $1, $2, 'hash')`,
        [dniNuevo(), email],
      );
    const filasDelIndice = () =>
      dataSource.query(
        `SELECT indexdef FROM pg_indexes WHERE tablename = 'usuarios' AND indexname = $1`,
        [NOMBRE_INDICE],
      );

    it('existe un indice unico sobre lower(email)', async () => {
      const filas = await filasDelIndice();

      expect(filas).toHaveLength(1);
      expect(filas[0].indexdef).toMatch(/UNIQUE/i);
      expect(filas[0].indexdef).toMatch(/lower/i);
    });

    it('la base rechaza dos emails que difieren solo en mayusculas aunque se salte la API', async () => {
      const email = `e2e-caso-${Date.now()}@example.com`;
      await insertarDirecto(email);

      await expect(insertarDirecto(email.toUpperCase())).rejects.toThrow(
        new RegExp(NOMBRE_INDICE),
      );
    });

    it('la sincronizacion del esquema no elimina el indice', async () => {
      //TypeORM elimina los indices que no conoce salvo los declarados con synchronize: false
      await dataSource.synchronize();

      expect(await filasDelIndice()).toHaveLength(1);
    });
  });
});
