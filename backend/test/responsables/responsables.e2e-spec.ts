import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  crearUsuarioResponsable,
  habilitarUsuario,
  obtenerBearerAdmin,
  ID_INEXISTENTE,
  obtenerOrganismoBaseId,
  registrarUsuario,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Responsables (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let organismoId: number;
  let bearer: string;

  //crear responsables y listarlos por organismo son operaciones del ADMIN
  const crearResponsable = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/responsables')
      .set('Authorization', bearer)
      .send(body as object);
  const listarResponsables = (id: number | string) =>
    request(app.getHttpServer())
      .get(`/api/v1/organismos/${id}/responsables`)
      .set('Authorization', bearer);

  //crea un usuario habilitado como RESPONSABLE y su responsable; devuelve ambos ids
  const nuevoResponsable = async (): Promise<{
    id: number;
    usuarioId: number;
  }> => {
    const usuarioId = await crearUsuarioResponsable(app);
    const res = await crearResponsable({ usuarioId }).expect(201);
    return { id: res.body.id, usuarioId };
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
    bearer = await obtenerBearerAdmin(app);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /responsables', () => {
    it('201: crea un responsable activo y sin organismo asignado, sin datos personales', async () => {
      const usuarioId = await crearUsuarioResponsable(app);
      const res = await crearResponsable({ usuarioId }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        usuarioId,
        active: true,
        organismoId: null,
        fechaCreacion: expect.any(String),
      });
      for (const campo of ['nombre', 'apellido', 'email'])
        expect(res.body).not.toHaveProperty(campo);

      const [fila] = await dataSource.query(
        `SELECT * FROM responsables WHERE id = $1`,
        [res.body.id],
      );
      expect(fila).toMatchObject({
        usuario_id: usuarioId,
        active: true,
        organismo_id: null,
      });
    });

    it('201: ignora organismoId, active y datos personales si el cliente los envia', async () => {
      const usuarioId = await crearUsuarioResponsable(app);
      const res = await crearResponsable({
        usuarioId,
        organismoId,
        active: false,
        nombre: 'Intruso',
        email: 'intruso@example.com',
      }).expect(201);

      expect(res.body.organismoId).toBeNull();
      expect(res.body.active).toBe(true);
      expect(res.body).not.toHaveProperty('nombre');
    });

    it('201: acepta un usuario con varios roles si incluye RESPONSABLE', async () => {
      const usuarioId = await registrarUsuario(app);
      await habilitarUsuario(app, usuarioId, ['AUDITOR', 'RESPONSABLE']);

      await crearResponsable({ usuarioId }).expect(201);
    });

    it('404: el usuario no existe', async () => {
      await crearResponsable({ usuarioId: ID_INEXISTENTE }).expect(404);
    });

    it('409: el usuario no esta activo (sin crear el responsable)', async () => {
      const usuarioId = await registrarUsuario(app);

      await crearResponsable({ usuarioId }).expect(409);

      const filas = await dataSource.query(
        `SELECT id FROM responsables WHERE usuario_id = $1`,
        [usuarioId],
      );
      expect(filas).toHaveLength(0);
    });

    it('409: el usuario esta activo pero no tiene el rol RESPONSABLE (sin crear el responsable)', async () => {
      const usuarioId = await registrarUsuario(app);
      await habilitarUsuario(app, usuarioId, ['AUDITOR']);

      const res = await crearResponsable({ usuarioId }).expect(409);

      expect(res.body.message).toContain('RESPONSABLE');
      const filas = await dataSource.query(
        `SELECT id FROM responsables WHERE usuario_id = $1`,
        [usuarioId],
      );
      expect(filas).toHaveLength(0);
    });

    it('409: el usuario ya tiene un responsable', async () => {
      const { usuarioId } = await nuevoResponsable();

      await crearResponsable({ usuarioId }).expect(409);

      const filas = await dataSource.query(
        `SELECT id FROM responsables WHERE usuario_id = $1`,
        [usuarioId],
      );
      expect(filas).toHaveLength(1);
    });

    it('409 (no 500): dos solicitudes concurrentes para el mismo usuario', async () => {
      const usuarioId = await crearUsuarioResponsable(app);

      const resultados = await Promise.all([
        crearResponsable({ usuarioId }),
        crearResponsable({ usuarioId }),
      ]);

      expect(resultados.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
    });

    it.each([
      ['body vacio', {}],
      ['usuarioId como string', { usuarioId: '1' }],
      ['usuarioId cero', { usuarioId: 0 }],
      ['usuarioId negativo', { usuarioId: -1 }],
      ['usuarioId decimal', { usuarioId: 1.5 }],
      ['usuarioId fuera de rango int4', { usuarioId: 99999999999 }],
      ['usuarioId nulo', { usuarioId: null }],
      [
        'solo datos personales (formato anterior)',
        { nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com' },
      ],
    ])('400: %s', async (_caso, body) => {
      await crearResponsable(body).expect(400);
    });
  });

  describe('esquema de la tabla responsables', () => {
    it('ya no tiene nombre, apellido ni email, y guarda usuario_id', async () => {
      const columnas = await dataSource.query(
        `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'responsables'`,
      );
      const nombres = columnas
        .map((c: { column_name: string }) => c.column_name)
        .sort();

      expect(nombres).toEqual([
        'active',
        'fecha_creacion',
        'id',
        'organismo_id',
        'usuario_id',
      ]);
      expect(
        columnas.find(
          (c: { column_name: string }) => c.column_name === 'usuario_id',
        ).is_nullable,
      ).toBe('NO');
    });

    it('la base impide dos responsables para el mismo usuario', async () => {
      const { usuarioId } = await nuevoResponsable();

      await expect(
        dataSource.query(`INSERT INTO responsables (usuario_id) VALUES ($1)`, [
          usuarioId,
        ]),
      ).rejects.toThrow(/duplicate key|unique/i);
    });

    it('la base exige un usuario existente', async () => {
      await expect(
        dataSource.query(`INSERT INTO responsables (usuario_id) VALUES ($1)`, [
          ID_INEXISTENTE,
        ]),
      ).rejects.toThrow(/foreign key|violates/i);
    });
  });

  describe('GET /responsables', () => {
    const listar = (query = '') =>
      request(app.getHttpServer())
        .get(`/api/v1/responsables${query}`)
        .set('Authorization', bearer);
    const asignarOrganismo = (id: number) =>
      request(app.getHttpServer())
        .patch(`/api/v1/responsables/${id}/organismo`)
        .set('Authorization', bearer)
        .send({ organismoId })
        .expect(200);
    const buscar = (
      body: { id: number; organismoId: number | null }[],
      id: number,
    ) => body.find((r) => r.id === id);

    it('200: cada responsable trae los datos de su usuario, sin dni, roles ni password', async () => {
      const { id, usuarioId } = await nuevoResponsable();
      const [usuario] = await dataSource.query(
        `SELECT nombre, apellido, email, password, dni FROM usuarios WHERE id = $1`,
        [usuarioId],
      );

      const res = await listar().expect(200);

      expect(buscar(res.body, id)).toEqual({
        id,
        usuarioId,
        active: true,
        organismoId: null,
        fechaCreacion: expect.any(String),
        usuario: {
          id: usuarioId,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
        },
      });
      const json = JSON.stringify(res.body);
      expect(json).not.toContain(usuario.password);
      expect(json).not.toContain('"dni"');
      expect(json).not.toContain('"roles"');
    });

    it('200: ordena por id ascendente', async () => {
      await nuevoResponsable();
      await nuevoResponsable();
      const res = await listar().expect(200);
      const ids: number[] = res.body.map((r: { id: number }) => r.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });

    it('200: sinOrganismo=true excluye a los responsables ya asignados', async () => {
      const libre = await nuevoResponsable();
      const asignado = await nuevoResponsable();
      await asignarOrganismo(asignado.id);

      const res = await listar('?sinOrganismo=true').expect(200);

      expect(buscar(res.body, libre.id)).toBeDefined();
      expect(buscar(res.body, asignado.id)).toBeUndefined();
      for (const r of res.body) expect(r.organismoId).toBeNull();
    });

    it.each(['', '?sinOrganismo=false'])(
      '200: sin filtro (%s) devuelve asignados y libres',
      async (query) => {
        const libre = await nuevoResponsable();
        const asignado = await nuevoResponsable();
        await asignarOrganismo(asignado.id);

        const res = await listar(query).expect(200);

        expect(buscar(res.body, libre.id)?.organismoId).toBeNull();
        expect(buscar(res.body, asignado.id)?.organismoId).toBe(organismoId);
      },
    );

    it.each(['si', '1', 'TRUE', ''])(
      '400: sinOrganismo="%s" no es un booleano valido',
      async (valor) => {
        await listar(`?sinOrganismo=${valor}`).expect(400);
      },
    );
  });

  describe('GET /organismos/:organismoId/responsables', () => {
    it('200: lista solo los responsables asignados al organismo', async () => {
      const asignado = await nuevoResponsable();
      const sinOrganismo = await nuevoResponsable();

      await request(app.getHttpServer())
        .patch(`/api/v1/responsables/${asignado.id}/organismo`)
        .set('Authorization', bearer)
        .send({ organismoId })
        .expect(200);

      const res = await listarResponsables(organismoId).expect(200);
      const ids: number[] = res.body.map((r: { id: number }) => r.id);
      expect(ids).toContain(asignado.id);
      expect(ids).not.toContain(sinOrganismo.id);
      expect(
        res.body.find((r: { id: number }) => r.id === asignado.id),
      ).toEqual({
        id: asignado.id,
        usuarioId: asignado.usuarioId,
        active: true,
        organismoId,
        fechaCreacion: expect.any(String),
      });
      for (const r of res.body) expect(r.organismoId).toBe(organismoId);
    });

    it('404: organismo inexistente', async () => {
      await listarResponsables(ID_INEXISTENTE).expect(404);
    });

    it('400: id de ruta invalido', async () => {
      await listarResponsables('abc').expect(400);
    });
  });

  describe('PATCH /responsables/:id/organismo', () => {
    const asignar = (id: number | string, body: unknown) =>
      request(app.getHttpServer())
        .patch(`/api/v1/responsables/${id}/organismo`)
        .set('Authorization', bearer)
        .send(body as object);

    const nuevoOrganismo = async (): Promise<number> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/organismos')
        .set('Authorization', bearer)
        .send({
          nombre: `__E2E__ Asignacion ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          rubro: 'E2E',
        })
        .expect(201);
      return res.body.id;
    };
    const organismoDe = async (
      responsableId: number,
    ): Promise<number | null> => {
      const [fila] = await dataSource.query(
        `SELECT organismo_id FROM responsables WHERE id = $1`,
        [responsableId],
      );
      return fila.organismo_id;
    };

    it('200: asigna el responsable y luego lo reasigna a otro organismo', async () => {
      const { id: responsableId, usuarioId } = await nuevoResponsable();
      const otroOrganismoId = await nuevoOrganismo();

      const res = await asignar(responsableId, { organismoId }).expect(200);
      expect(res.body).toEqual({
        id: responsableId,
        usuarioId,
        active: true,
        organismoId,
        fechaCreacion: expect.any(String),
      });
      const enBase = await listarResponsables(organismoId).expect(200);
      expect(enBase.body.map((r: { id: number }) => r.id)).toContain(
        responsableId,
      );

      const reasignado = await asignar(responsableId, {
        organismoId: otroOrganismoId,
      }).expect(200);
      expect(reasignado.body.organismoId).toBe(otroOrganismoId);
      expect(reasignado.body.usuarioId).toBe(usuarioId);
      const enOrigen = await listarResponsables(organismoId).expect(200);
      expect(enOrigen.body.map((r: { id: number }) => r.id)).not.toContain(
        responsableId,
      );
      const enDestino = await listarResponsables(otroOrganismoId).expect(200);
      expect(enDestino.body.map((r: { id: number }) => r.id)).toEqual([
        responsableId,
      ]);
    });

    it('200: reasignar al mismo organismo es idempotente', async () => {
      const { id: responsableId } = await nuevoResponsable();
      await asignar(responsableId, { organismoId }).expect(200);
      const res = await asignar(responsableId, { organismoId }).expect(200);
      expect(res.body.organismoId).toBe(organismoId);
    });

    it('404: responsable inexistente', async () => {
      await asignar(ID_INEXISTENTE, { organismoId }).expect(404);
    });

    it('404: organismo inexistente, sin modificar al responsable', async () => {
      const { id: responsableId } = await nuevoResponsable();
      await asignar(responsableId, { organismoId: ID_INEXISTENTE }).expect(404);
      expect(await organismoDe(responsableId)).toBeNull();
    });

    it('409: responsable inactivo, sin modificarlo', async () => {
      const { id: responsableId } = await nuevoResponsable();
      await dataSource.query(
        `UPDATE responsables SET active = false WHERE id = $1`,
        [responsableId],
      );

      await asignar(responsableId, { organismoId }).expect(409);
      expect(await organismoDe(responsableId)).toBeNull();
    });

    //el usuario puede ser desactivado o perder el rol despues de crear el responsable
    it('409: el usuario del responsable fue desactivado, sin modificar al responsable', async () => {
      const { id: responsableId, usuarioId } = await nuevoResponsable();
      await request(app.getHttpServer())
        .patch(`/api/v1/usuarios/${usuarioId}/activar`)
        .set('Authorization', bearer)
        .send({ active: false, roles: [] })
        .expect(200);

      const res = await asignar(responsableId, { organismoId }).expect(409);

      expect(res.body.message).toContain('RESPONSABLE');
      expect(await organismoDe(responsableId)).toBeNull();
    });

    it('409: al usuario del responsable le quitaron el rol RESPONSABLE, sin modificar al responsable', async () => {
      const { id: responsableId, usuarioId } = await nuevoResponsable();
      await habilitarUsuario(app, usuarioId, ['AUDITOR']);

      await asignar(responsableId, { organismoId }).expect(409);

      expect(await organismoDe(responsableId)).toBeNull();
    });

    it('200: si el usuario vuelve a habilitarse como RESPONSABLE, la asignacion vuelve a funcionar', async () => {
      const { id: responsableId, usuarioId } = await nuevoResponsable();
      await request(app.getHttpServer())
        .patch(`/api/v1/usuarios/${usuarioId}/activar`)
        .set('Authorization', bearer)
        .send({ active: false, roles: [] })
        .expect(200);
      await asignar(responsableId, { organismoId }).expect(409);

      await habilitarUsuario(app, usuarioId, ['RESPONSABLE']);

      await asignar(responsableId, { organismoId }).expect(200);
      expect(await organismoDe(responsableId)).toBe(organismoId);
    });

    it('409: organismo inactivo, sin modificar al responsable', async () => {
      const { id: responsableId } = await nuevoResponsable();
      const inactivoId = await nuevoOrganismo();
      await dataSource.query(
        `UPDATE organismos SET active = false WHERE id = $1`,
        [inactivoId],
      );

      await asignar(responsableId, { organismoId: inactivoId }).expect(409);
      expect(await organismoDe(responsableId)).toBeNull();
    });

    it('orden de validacion: el responsable se valida antes que el organismo', async () => {
      const { id: inactivoId } = await nuevoResponsable();
      await dataSource.query(
        `UPDATE responsables SET active = false WHERE id = $1`,
        [inactivoId],
      );

      //responsable inactivo + organismo inexistente => 409 (no 404)
      await asignar(inactivoId, { organismoId: ID_INEXISTENTE }).expect(409);
      //usuario deshabilitado + organismo inexistente => 409 (el usuario se valida antes)
      const { id: conUsuarioInactivo, usuarioId } = await nuevoResponsable();
      await request(app.getHttpServer())
        .patch(`/api/v1/usuarios/${usuarioId}/activar`)
        .set('Authorization', bearer)
        .send({ active: false, roles: [] })
        .expect(200);
      await asignar(conUsuarioInactivo, { organismoId: ID_INEXISTENTE }).expect(
        409,
      );
      //responsable inexistente + organismo inexistente => 404 por el responsable
      const res = await asignar(ID_INEXISTENTE, {
        organismoId: ID_INEXISTENTE,
      }).expect(404);
      expect(res.body.message).toContain('Responsable');
    });

    it('400: body o id de ruta invalidos', async () => {
      const { id: responsableId } = await nuevoResponsable();
      for (const body of [
        {},
        { organismoId: 0 },
        { organismoId: -1 },
        { organismoId: 1.5 },
        { organismoId: '1' },
      ]) {
        await asignar(responsableId, body).expect(400);
      }
      await asignar('abc', { organismoId }).expect(400);
      expect(await organismoDe(responsableId)).toBeNull();
    });
  });

  describe('GET /responsables/me/organismo', () => {
    const miOrganismo = (bearerToken?: string) => {
      const consulta = request(app.getHttpServer()).get(
        '/api/v1/responsables/me/organismo',
      );
      return bearerToken
        ? consulta.set('Authorization', bearerToken)
        : consulta;
    };

    //usuario RESPONSABLE con credenciales: devuelve su bearer, su usuarioId y su responsableId (si se pide)
    const responsableConSesion = async (
      conResponsable: boolean,
    ): Promise<{ bearer: string; responsableId?: number }> => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['RESPONSABLE']);
      let responsableId: number | undefined;
      if (conResponsable) {
        const res = await crearResponsable({ usuarioId: id }).expect(201);
        responsableId = res.body.id;
      }
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      return { bearer: `Bearer ${login.body.accessToken}`, responsableId };
    };

    const asignarOrganismo = (responsableId: number, id: number) =>
      dataSource.query(
        `UPDATE responsables SET organismo_id = $1 WHERE id = $2`,
        [id, responsableId],
      );

    //organismo inactivo fijo (find-or-create): ningun test lo activa
    const obtenerOrganismoInactivoId = async (): Promise<number> => {
      const nombre = '__E2E__ Organismo Inactivo';
      const existente = await dataSource.query(
        `SELECT id FROM organismos WHERE nombre = $1 LIMIT 1`,
        [nombre],
      );
      if (existente.length) return existente[0].id;
      const [creado] = await dataSource.query(
        `INSERT INTO organismos (nombre, rubro, active) VALUES ($1, 'E2E', false) RETURNING id`,
        [nombre],
      );
      return creado.id;
    };

    it('200: devuelve el organismo asignado al responsable autenticado', async () => {
      const { bearer: bearerResponsable, responsableId } =
        await responsableConSesion(true);
      await asignarOrganismo(responsableId!, organismoId);

      const res = await miOrganismo(bearerResponsable).expect(200);
      expect(res.body).toEqual({
        id: organismoId,
        nombre: '__E2E__ Organismo Base',
        rubro: 'E2E',
        active: true,
        fechaCreacion: expect.any(String),
      });
    });

    it('401: sin token o con token invalido', async () => {
      await miOrganismo().expect(401);
      await miOrganismo('Bearer token-invalido').expect(401);
    });

    it('403: un usuario sin el rol RESPONSABLE no puede consultarlo', async () => {
      await miOrganismo(bearer).expect(403);
    });

    it('404: el usuario tiene el rol pero no tiene un Responsable asociado', async () => {
      const { bearer: bearerSinPerfil } = await responsableConSesion(false);
      const res = await miOrganismo(bearerSinPerfil).expect(404);
      expect(res.body.message).toContain('Responsable');
    });

    it('409: el responsable todavia no tiene organismo asignado', async () => {
      const { bearer: bearerSinOrganismo } = await responsableConSesion(true);
      const res = await miOrganismo(bearerSinOrganismo).expect(409);
      expect(res.body.message).toContain('organismo');
    });

    it('409: el responsable esta inactivo', async () => {
      const { bearer: bearerInactivo, responsableId } =
        await responsableConSesion(true);
      await asignarOrganismo(responsableId!, organismoId);
      await dataSource.query(
        `UPDATE responsables SET active = false WHERE id = $1`,
        [responsableId],
      );
      await miOrganismo(bearerInactivo).expect(409);
    });

    it('409: el organismo asignado esta inactivo', async () => {
      const { bearer: bearerOrganismoInactivo, responsableId } =
        await responsableConSesion(true);
      await asignarOrganismo(
        responsableId!,
        await obtenerOrganismoInactivoId(),
      );
      const res = await miOrganismo(bearerOrganismoInactivo).expect(409);
      expect(res.body.message).toContain('no está activo');
    });
  });
});
