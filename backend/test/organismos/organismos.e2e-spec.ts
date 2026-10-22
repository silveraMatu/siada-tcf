import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import { crearSesionConRol, obtenerBearerAdmin } from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Organismos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let bearerAdmin: string;

  //por defecto con la sesión de un ADMIN; `null` = sin token
  const crear = (body: unknown, bearer: string | null = bearerAdmin) => {
    const peticion = request(app.getHttpServer()).post('/api/v1/organismos');
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      body as object,
    );
  };
  const listar = (bearer: string | null = bearerAdmin) => {
    const peticion = request(app.getHttpServer()).get('/api/v1/organismos');
    return bearer ? peticion.set('Authorization', bearer) : peticion;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /organismos', () => {
    it('201: crea el organismo activo y devuelve el contrato de respuesta', async () => {
      const nombre = `__E2E__ Organismo ${Date.now()}`;
      const res = await crear({ nombre, rubro: 'Educacion' }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        nombre,
        rubro: 'Educacion',
        active: true,
        fechaCreacion: expect.any(String),
      });
      expect(Number.isNaN(Date.parse(res.body.fechaCreacion))).toBe(false);

      const [fila] = await dataSource.query(
        `SELECT * FROM organismos WHERE id = $1`,
        [res.body.id],
      );
      expect(fila).toMatchObject({ nombre, rubro: 'Educacion', active: true });
    });

    it('201: ignora `active` enviado por el cliente (siempre nace activo)', async () => {
      const res = await crear({
        nombre: `__E2E__ Active ${Date.now()}`,
        rubro: 'E2E',
        active: false,
      }).expect(201);
      expect(res.body.active).toBe(true);
    });

    it('201: recorta espacios en nombre y rubro', async () => {
      const sufijo = Date.now();
      const res = await crear({
        nombre: `  __E2E__ Trim ${sufijo}  `,
        rubro: '  E2E  ',
      }).expect(201);
      expect(res.body).toMatchObject({
        nombre: `__E2E__ Trim ${sufijo}`,
        rubro: 'E2E',
      });
    });

    it('201: permite organismos con el mismo nombre', async () => {
      const nombre = `__E2E__ Repetido ${Date.now()}`;
      const a = await crear({ nombre, rubro: 'E2E' }).expect(201);
      const b = await crear({ nombre, rubro: 'E2E' }).expect(201);
      expect(a.body.id).not.toBe(b.body.id);
    });

    it('201: acepta nombre y rubro de exactamente 255 caracteres', async () => {
      const res = await crear({
        nombre: 'n'.repeat(255),
        rubro: 'r'.repeat(255),
      }).expect(201);
      expect(res.body.nombre).toHaveLength(255);
      expect(res.body.rubro).toHaveLength(255);
    });

    it.each([
      ['body vacio', {}],
      ['sin nombre', { rubro: 'E2E' }],
      ['sin rubro', { nombre: 'X' }],
      ['nombre vacio', { nombre: '', rubro: 'E2E' }],
      ['nombre solo espacios', { nombre: '   ', rubro: 'E2E' }],
      ['rubro vacio', { nombre: 'X', rubro: '' }],
      ['rubro solo espacios', { nombre: 'X', rubro: '   ' }],
      ['nombre de 256 caracteres', { nombre: 'n'.repeat(256), rubro: 'E2E' }],
      ['rubro de 256 caracteres', { nombre: 'X', rubro: 'r'.repeat(256) }],
      ['nombre numerico', { nombre: 123, rubro: 'E2E' }],
      ['rubro nulo', { nombre: 'X', rubro: null }],
    ])('400: %s', async (_caso, body) => {
      await crear(body).expect(400);
    });
  });

  describe('GET /organismos', () => {
    it('200: devuelve un arreglo con el contrato de respuesta y orden por id ascendente', async () => {
      const nombre = `__E2E__ Listado ${Date.now()}`;
      const creado = await crear({ nombre, rubro: 'E2E' }).expect(201);

      const res = await listar().expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(
        res.body.find((o: { id: number }) => o.id === creado.body.id),
      ).toEqual(creado.body);

      for (const organismo of res.body) {
        expect(organismo).toEqual({
          id: expect.any(Number),
          nombre: expect.any(String),
          rubro: expect.any(String),
          active: expect.any(Boolean),
          fechaCreacion: expect.any(String),
        });
      }

      const ids: number[] = res.body.map((o: { id: number }) => o.id);
      expect(ids).toEqual([...ids].sort((x, y) => x - y));
    });

    it('200: la cantidad listada coincide con la tabla', async () => {
      const res = await listar().expect(200);
      const [{ total }] = await dataSource.query(
        `SELECT COUNT(*)::int AS total FROM organismos`,
      );
      expect(res.body).toHaveLength(total);
    });
  });

  describe('autorización', () => {
    const cuerpoNuevo = () => ({
      nombre: `__E2E__ Autorizacion ${Date.now()}`,
      rubro: 'E2E',
    });
    const contarOrganismos = async (): Promise<number> => {
      const [{ total }] = await dataSource.query(
        `SELECT COUNT(*)::int AS total FROM organismos`,
      );
      return total;
    };

    it('401: sin token no se puede listar ni crear', async () => {
      await listar(null).expect(401);
      const antes = await contarOrganismos();

      await crear(cuerpoNuevo(), null).expect(401);

      expect(await contarOrganismos()).toBe(antes);
    });

    it.each(['AUDITOR', 'RESPONSABLE'] as const)(
      '403: un %s no puede listar ni crear organismos',
      async (rol) => {
        const bearer = await crearSesionConRol(app, rol);
        const antes = await contarOrganismos();

        await listar(bearer).expect(403);
        await crear(cuerpoNuevo(), bearer).expect(403);

        expect(await contarOrganismos()).toBe(antes);
      },
    );

    it('JUEZ_TRAMITE puede listar pero no crear organismos', async () => {
      const bearer = await crearSesionConRol(app, 'JUEZ_TRAMITE');
      const antes = await contarOrganismos();

      await listar(bearer).expect(200);
      await crear(cuerpoNuevo(), bearer).expect(403);

      expect(await contarOrganismos()).toBe(antes);
    });
  });
});
