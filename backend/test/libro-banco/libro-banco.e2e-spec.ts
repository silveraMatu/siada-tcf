import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_CON_LIBRO,
  MES_PRESENTAR,
  MES_SIN_LIBRO,
  fijarEstadoCuenta,
  obtenerOrganismoBaseId,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Libro banco (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  let libroIngestadoId: number;

  const ingestar = (id: number | string, body: unknown) =>
    request(app.getHttpServer())
      .post(`/api/v1/cuentas-mensuales/${id}/libro-banco/ingestar`)
      .send(body as object);
  const obtener = (id: number | string) =>
    request(app.getHttpServer()).get(
      `/api/v1/cuentas-mensuales/${id}/libro-banco`,
    );

  const transaccionesValidas = () => [
    {
      fecha: '2026-03-02',
      cheque: '0001',
      aLaOrdenDe: 'Proveedor E2E',
      depositos: 0,
      retiro: 1500.5,
      saldo: 8499.5,
    },
    { aLaOrdenDe: 'Cliente E2E', depositos: 2000, retiro: 0, saldo: 10499.5 },
  ];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());

    //pre-requisito: las cuentas mensuales se resuelven por el endpoint de cuentas (idempotente)
    const organismoId = await obtenerOrganismoBaseId(dataSource);
    cuentaMensualId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_CON_LIBRO,
    );
    cuentaMensualSinLibroId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_SIN_LIBRO,
    );
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
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
      for (const t of res.body.transacciones)
        expect(t.id).toEqual(expect.any(Number));
      libroIngestadoId = res.body.id;

      const [fila] = await dataSource.query(
        `SELECT count(*)::int AS n FROM transacciones_libro_banco WHERE libro_banco_id = $1`,
        [libroIngestadoId],
      );
      expect(fila.n).toBe(2);
    });

    it('404: cuenta mensual inexistente', async () => {
      await ingestar(ID_INEXISTENTE, {
        transacciones: transaccionesValidas(),
      }).expect(404);
    });

    it.each([
      ['lista de transacciones vacia', { transacciones: [] }],
      ['sin transacciones', { numeroCuentaCte: 'X' }],
      ['aLaOrdenDe faltante', { transacciones: [{ saldo: 10 }] }],
      [
        'saldo como string',
        { transacciones: [{ aLaOrdenDe: 'X', saldo: '10' }] },
      ],
      [
        'deposito negativo',
        { transacciones: [{ aLaOrdenDe: 'X', depositos: -1, saldo: 10 }] },
      ],
      [
        'monto fuera de rango numeric(14,2)',
        { transacciones: [{ aLaOrdenDe: 'X', depositos: 1e15, saldo: 10 }] },
      ],
    ])('400: %s', async (_caso, body) => {
      await ingestar(cuentaMensualId, body).expect(400);
    });

    it('400: id de cuenta mensual invalido', async () => {
      await ingestar('abc', { transacciones: transaccionesValidas() }).expect(
        400,
      );
    });

    //el limite general de body es 100kb; solo esta ruta admite hasta 10mb (ver configurarApp)
    it('201: acepta un libro grande, de más de 100kb', async () => {
      const transacciones = Array.from({ length: 1000 }, (_, i) => ({
        aLaOrdenDe: `Proveedor E2E ${i} ${'x'.repeat(60)}`,
        depositos: 0,
        retiro: 1,
        saldo: 100000 - i,
      }));
      expect(
        Buffer.byteLength(JSON.stringify({ transacciones })),
      ).toBeGreaterThan(100 * 1024);

      const res = await ingestar(cuentaMensualId, { transacciones }).expect(
        201,
      );

      expect(res.body.transacciones).toHaveLength(1000);
    });

    it('413: rechaza bodies de más de 10mb', async () => {
      await ingestar(cuentaMensualId, {
        numeroCuentaCte: 'x'.repeat(11 * 1024 * 1024),
        transacciones: transaccionesValidas(),
      }).expect(413);
    });
  });

  describe('GET /cuentas-mensuales/:cuentaMensualId/libro-banco', () => {
    it('200: devuelve el libro ingestado con todas sus transacciones', async () => {
      const res = await obtener(cuentaMensualId).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      //los libros se acumulan entre ejecuciones: se busca el recien ingestado por id
      const libro = res.body.find(
        (l: { id: number }) => l.id === libroIngestadoId,
      );
      expect(libro).toBeDefined();
      expect(libro).toMatchObject({
        cuentaMensualId,
        numeroCuentaCte: '123-456/E2E',
      });
      expect(libro.transacciones).toHaveLength(2);

      const t1 = libro.transacciones.find(
        (t: { aLaOrdenDe: string }) => t.aLaOrdenDe === 'Proveedor E2E',
      );
      expect(t1).toMatchObject({
        fecha: '2026-03-02',
        cheque: '0001',
        depositos: 0,
        retiro: 1500.5,
        saldo: 8499.5,
      });
      const t2 = libro.transacciones.find(
        (t: { aLaOrdenDe: string }) => t.aLaOrdenDe === 'Cliente E2E',
      );
      expect(t2).toMatchObject({
        fecha: null,
        cheque: null,
        depositos: 2000,
        retiro: 0,
        saldo: 10499.5,
      });
    });

    it('200: devuelve lista vacia para una cuenta existente sin libros', async () => {
      const res = await obtener(cuentaMensualSinLibroId).expect(200);
      expect(res.body).toEqual([]);
    });

    it('404: cuenta mensual inexistente', async () => {
      await obtener(ID_INEXISTENTE).expect(404);
    });

    it.each(['abc', '0', '-1', '1.5', '99999999999'])(
      '400: id invalido (%s)',
      async (id) => {
        await obtener(id).expect(400);
      },
    );
  });
  describe('candado: cuenta ya enviada a auditoría', () => {
    let cuentaBloqueadaId: number;

    const contarLibros = async (): Promise<number> => {
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM libros_banco WHERE cuenta_mensual_id = $1`,
        [cuentaBloqueadaId],
      );
      return total;
    };

    beforeAll(async () => {
      cuentaBloqueadaId = await resolverCuentaMensualId(
        app,
        await obtenerOrganismoBaseId(dataSource),
        MES_PRESENTAR,
      );
    });

    afterAll(async () => {
      //no dejar la cuenta compartida bloqueada para otros specs
      await fijarEstadoCuenta(dataSource, cuentaBloqueadaId);
    });

    it('201: en borrador la ingesta funciona', async () => {
      await fijarEstadoCuenta(dataSource, cuentaBloqueadaId);
      const antes = await contarLibros();

      await ingestar(cuentaBloqueadaId, {
        transacciones: transaccionesValidas(),
      }).expect(201);

      expect(await contarLibros()).toBe(antes + 1);
    });

    it.each([
      'LISTO_PARA_AUDITAR',
      'EN_AUDITORIA',
      'AUDITADA',
      'CON_OBSERVACIONES',
    ])('409: con la cuenta en %s no se sube ningun libro', async (estado) => {
      await fijarEstadoCuenta(dataSource, cuentaBloqueadaId, estado);
      const antes = await contarLibros();

      const res = await ingestar(cuentaBloqueadaId, {
        transacciones: transaccionesValidas(),
      }).expect(409);

      expect(res.body.message).toBe(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
      expect(await contarLibros()).toBe(antes);
    });

    it('GET: la lectura sigue funcionando con la cuenta bloqueada', async () => {
      await fijarEstadoCuenta(
        dataSource,
        cuentaBloqueadaId,
        'LISTO_PARA_AUDITAR',
      );

      await obtener(cuentaBloqueadaId).expect(200);
    });
  });
});
