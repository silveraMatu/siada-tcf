import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('SIADA API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const EJERCICIO = 2026;
  const MES_CON_LIBRO = 3;
  const MES_SIN_LIBRO = 12; //reservado: nunca se ingesta ningun libro en este mes
  const ID_INEXISTENTE = 999999;

  let organismoId: number;
  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  let libroIngestadoId: number;

  const resolver = (body: unknown) =>
    request(app.getHttpServer()).post('/api/v1/cuentas-mensuales/resolver').send(body as object);
  const ingestar = (id: number | string, body: unknown) =>
    request(app.getHttpServer())
      .post(`/api/v1/cuentas-mensuales/${id}/libro-banco/ingestar`)
      .send(body as object);
  const obtener = (id: number | string) =>
    request(app.getHttpServer()).get(`/api/v1/cuentas-mensuales/${id}/libro-banco`);

  const transaccionesValidas = () => [
    { fecha: '2026-03-02', cheque: '0001', aLaOrdenDe: 'Proveedor E2E', depositos: 0, retiro: 1500.5, saldo: 8499.5 },
    { aLaOrdenDe: 'Cliente E2E', depositos: 2000, retiro: 0, saldo: 10499.5 },
  ];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());

    //pre-requisito: organismo inicial (find-or-create, idempotente entre ejecuciones)
    const nombre = '__E2E__ Organismo Base';
    const existente = await dataSource.query(`SELECT id FROM organismos WHERE nombre = $1 LIMIT 1`, [nombre]);
    if (existente.length) {
      organismoId = existente[0].id;
    } else {
      const [creado] = await dataSource.query(
        `INSERT INTO organismos (nombre, rubro, active) VALUES ($1, 'E2E', true) RETURNING id`,
        [nombre],
      );
      organismoId = creado.id;
    }
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /cuentas-mensuales/resolver', () => {
    it('200: crea o resuelve la jerarquia cuenta anual / mensual', async () => {
      const res = await resolver({ organismoId, ejercicioFiscal: EJERCICIO, mes: MES_CON_LIBRO }).expect(200);

      expect(res.body).toMatchObject({ mes: MES_CON_LIBRO, estado: 'pendiente_carga' });
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.cuentaAnualId).toEqual(expect.any(Number));
      cuentaMensualId = res.body.id;

      const [anual] = await dataSource.query(`SELECT * FROM cuentas_anuales WHERE id = $1`, [res.body.cuentaAnualId]);
      expect(anual).toMatchObject({ organismo_id: organismoId, ejercicio_fiscal: EJERCICIO });
    });

    it('200: es idempotente (misma cuenta mensual en llamadas repetidas)', async () => {
      const res = await resolver({ organismoId, ejercicioFiscal: EJERCICIO, mes: MES_CON_LIBRO }).expect(200);
      expect(res.body.id).toBe(cuentaMensualId);
    });

    it('200: resuelve la cuenta mensual reservada sin libros', async () => {
      const res = await resolver({ organismoId, ejercicioFiscal: EJERCICIO, mes: MES_SIN_LIBRO }).expect(200);
      expect(res.body.id).not.toBe(cuentaMensualId);
      cuentaMensualSinLibroId = res.body.id;
    });

    it.each([
      ['mes 13', { ejercicioFiscal: EJERCICIO, mes: 13 }],
      ['mes 0', { ejercicioFiscal: EJERCICIO, mes: 0 }],
      ['mes decimal', { ejercicioFiscal: EJERCICIO, mes: 1.5 }],
      ['ejercicio fuera de rango', { ejercicioFiscal: 1999, mes: 3 }],
      ['organismoId negativo', { organismoId: -1, ejercicioFiscal: EJERCICIO, mes: 3 }],
      ['organismoId como string', { organismoId: '1', ejercicioFiscal: EJERCICIO, mes: 3 }],
      ['organismoId fuera de rango int4', { organismoId: 99999999999, ejercicioFiscal: EJERCICIO, mes: 3 }],
      ['body vacio', {}],
    ])('400: %s', async (_caso, parcial) => {
      await resolver({ organismoId, ...parcial }).expect(400);
    });

    it('404: organismo inexistente', async () => {
      await resolver({ organismoId: ID_INEXISTENTE, ejercicioFiscal: EJERCICIO, mes: 3 }).expect(404);
    });
  });

  describe('POST /cuentas-mensuales/:cuentaMensualId/libro-banco/ingestar', () => {
    it('201: guarda el libro con sus transacciones', async () => {
      const res = await ingestar(cuentaMensualId, {
        numeroCuentaCte: '123-456/E2E',
        transacciones: transaccionesValidas(),
      }).expect(201);

      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.cuentaMensualId).toBe(cuentaMensualId);
      expect(res.body.numeroCuentaCte).toBe('123-456/E2E');
      expect(res.body.transacciones).toHaveLength(2);
      for (const t of res.body.transacciones) expect(t.id).toEqual(expect.any(Number));
      libroIngestadoId = res.body.id;

      const [fila] = await dataSource.query(`SELECT count(*)::int AS n FROM transacciones_libro_banco WHERE libro_banco_id = $1`, [libroIngestadoId]);
      expect(fila.n).toBe(2);
    });

    it('404: cuenta mensual inexistente', async () => {
      await ingestar(ID_INEXISTENTE, { transacciones: transaccionesValidas() }).expect(404);
    });

    it.each([
      ['lista de transacciones vacia', { transacciones: [] }],
      ['sin transacciones', { numeroCuentaCte: 'X' }],
      ['aLaOrdenDe faltante', { transacciones: [{ saldo: 10 }] }],
      ['saldo como string', { transacciones: [{ aLaOrdenDe: 'X', saldo: '10' }] }],
      ['deposito negativo', { transacciones: [{ aLaOrdenDe: 'X', depositos: -1, saldo: 10 }] }],
      ['monto fuera de rango numeric(14,2)', { transacciones: [{ aLaOrdenDe: 'X', depositos: 1e15, saldo: 10 }] }],
    ])('400: %s', async (_caso, body) => {
      await ingestar(cuentaMensualId, body).expect(400);
    });

    it('400: id de cuenta mensual invalido', async () => {
      await ingestar('abc', { transacciones: transaccionesValidas() }).expect(400);
    });
  });

  describe('GET /cuentas-mensuales/:cuentaMensualId/libro-banco', () => {
    it('200: devuelve el libro ingestado con todas sus transacciones', async () => {
      const res = await obtener(cuentaMensualId).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      //los libros se acumulan entre ejecuciones: se busca el recien ingestado por id
      const libro = res.body.find((l: { id: number }) => l.id === libroIngestadoId);
      expect(libro).toBeDefined();
      expect(libro).toMatchObject({ cuentaMensualId, numeroCuentaCte: '123-456/E2E' });
      expect(libro.transacciones).toHaveLength(2);

      const t1 = libro.transacciones.find((t: { aLaOrdenDe: string }) => t.aLaOrdenDe === 'Proveedor E2E');
      expect(t1).toMatchObject({ fecha: '2026-03-02', cheque: '0001', depositos: 0, retiro: 1500.5, saldo: 8499.5 });
      const t2 = libro.transacciones.find((t: { aLaOrdenDe: string }) => t.aLaOrdenDe === 'Cliente E2E');
      expect(t2).toMatchObject({ fecha: null, cheque: null, depositos: 2000, retiro: 0, saldo: 10499.5 });
    });

    it('200: devuelve lista vacia para una cuenta existente sin libros', async () => {
      const res = await obtener(cuentaMensualSinLibroId).expect(200);
      expect(res.body).toEqual([]);
    });

    it('404: cuenta mensual inexistente', async () => {
      await obtener(ID_INEXISTENTE).expect(404);
    });

    it.each(['abc', '0', '-1', '1.5', '99999999999'])('400: id invalido (%s)', async (id) => {
      await obtener(id).expect(400);
    });
  });

  describe('Organismos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const crear = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/organismos')
      .send(body as object);
  const listar = () => request(app.getHttpServer()).get('/api/v1/organismos');

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
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
});

  describe('/organismos/:organismoId/responsables', () => {
    const crearResponsable = (id: number | string, body: unknown) =>
      request(app.getHttpServer()).post(`/api/v1/organismos/${id}/responsables`).send(body as object);
    const listarResponsables = (id: number | string) =>
      request(app.getHttpServer()).get(`/api/v1/organismos/${id}/responsables`);

    //email unico por ejecucion: los datos no se limpian
    const emailUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    it('201: crea un responsable activo asociado al organismo', async () => {
      const email = emailUnico();
      const res = await crearResponsable(organismoId, { nombre: ' Ana ', apellido: 'Pérez', email }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        nombre: 'Ana',
        apellido: 'Pérez',
        email,
        activo: true,
        organismoId,
        fechaCreacion: expect.any(String),
      });
    });

    it('200: lista los responsables del organismo, incluyendo el recien creado', async () => {
      const email = emailUnico();
      const creado = await crearResponsable(organismoId, { nombre: 'Luis', apellido: 'Gómez', email }).expect(201);

      const res = await listarResponsables(organismoId).expect(200);
      expect(res.body.find((r: { id: number }) => r.id === creado.body.id)).toEqual(creado.body);
      for (const r of res.body) expect(r.organismoId).toBe(organismoId);
    });

    it('404: crear o listar con un organismo inexistente', async () => {
      await crearResponsable(ID_INEXISTENTE, { nombre: 'A', apellido: 'B', email: emailUnico() }).expect(404);
      await listarResponsables(ID_INEXISTENTE).expect(404);
    });

    it('400: body invalido o id de ruta invalido', async () => {
      await crearResponsable(organismoId, { nombre: 'Ana', apellido: 'Pérez', email: 'no-es-un-email' }).expect(400);
      await crearResponsable(organismoId, { nombre: '', apellido: 'Pérez', email: emailUnico() }).expect(400);
      await crearResponsable(organismoId, { nombre: 'Ana' }).expect(400);
      await crearResponsable('abc', { nombre: 'Ana', apellido: 'Pérez', email: emailUnico() }).expect(400);
      await listarResponsables('abc').expect(400);
    });
  });
});
