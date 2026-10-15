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
});
