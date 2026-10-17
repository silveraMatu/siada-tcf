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

  describe('responsables', () => {
    const crearResponsable = (body: unknown) =>
      request(app.getHttpServer()).post('/api/v1/responsables').send(body as object);
    const listarResponsables = (id: number | string) =>
      request(app.getHttpServer()).get(`/api/v1/organismos/${id}/responsables`);

    //email unico por ejecucion: los datos no se limpian
    const emailUnico = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    describe('POST /responsables', () => {
      it('201: crea un responsable activo y sin organismo asignado', async () => {
        const email = emailUnico();
        const res = await crearResponsable({ nombre: ' Ana ', apellido: 'Pérez', email }).expect(201);

        expect(res.body).toEqual({
          id: expect.any(Number),
          nombre: 'Ana',
          apellido: 'Pérez',
          email,
          activo: true,
          organismoId: null,
          fechaCreacion: expect.any(String),
        });
      });

      it('201: ignora organismoId y activo si el cliente los envia', async () => {
        const res = await crearResponsable({
          nombre: 'Ana',
          apellido: 'Pérez',
          email: emailUnico(),
          organismoId,
          activo: false,
        }).expect(201);

        expect(res.body.organismoId).toBeNull();
        expect(res.body.activo).toBe(true);
      });

      it('400: body invalido', async () => {
        await crearResponsable({ nombre: 'Ana', apellido: 'Pérez', email: 'no-es-un-email' }).expect(400);
        await crearResponsable({ nombre: '', apellido: 'Pérez', email: emailUnico() }).expect(400);
        await crearResponsable({ nombre: 'Ana' }).expect(400);
      });
    });

    describe('GET /organismos/:organismoId/responsables', () => {
      it('200: lista solo los responsables asignados al organismo', async () => {
        const asignado = await crearResponsable({ nombre: 'Luis', apellido: 'Gómez', email: emailUnico() }).expect(201);
        const sinOrganismo = await crearResponsable({ nombre: 'Eva', apellido: 'Ruiz', email: emailUnico() }).expect(201);

        //todavia no existe el endpoint de asignacion: se fija el organismo directo en la base
        await dataSource.query(`UPDATE responsables SET organismo_id = $1 WHERE id = $2`, [organismoId, asignado.body.id]);

        const res = await listarResponsables(organismoId).expect(200);
        const ids: number[] = res.body.map((r: { id: number }) => r.id);
        expect(ids).toContain(asignado.body.id);
        expect(ids).not.toContain(sinOrganismo.body.id);
        expect(res.body.find((r: { id: number }) => r.id === asignado.body.id)).toEqual({
          ...asignado.body,
          organismoId,
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
        request(app.getHttpServer()).patch(`/api/v1/responsables/${id}/organismo`).send(body as object);

      const nuevoResponsable = async (): Promise<number> => {
        const res = await crearResponsable({ nombre: 'Asig', apellido: 'Nado', email: emailUnico() }).expect(201);
        return res.body.id;
      };
      const nuevoOrganismo = async (): Promise<number> => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/organismos')
          .send({ nombre: `__E2E__ Asignacion ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rubro: 'E2E' })
          .expect(201);
        return res.body.id;
      };
      const organismoDe = async (responsableId: number): Promise<number | null> => {
        const [fila] = await dataSource.query(`SELECT organismo_id FROM responsables WHERE id = $1`, [responsableId]);
        return fila.organismo_id;
      };

      it('200: asigna el responsable y luego lo reasigna a otro organismo', async () => {
        const responsableId = await nuevoResponsable();
        const otroOrganismoId = await nuevoOrganismo();

        const res = await asignar(responsableId, { organismoId }).expect(200);
        expect(res.body).toEqual({
          id: responsableId,
          nombre: 'Asig',
          apellido: 'Nado',
          email: expect.any(String),
          activo: true,
          organismoId,
          fechaCreacion: expect.any(String),
        });
        const enBase = await listarResponsables(organismoId).expect(200);
        expect(enBase.body.map((r: { id: number }) => r.id)).toContain(responsableId);

        const reasignado = await asignar(responsableId, { organismoId: otroOrganismoId }).expect(200);
        expect(reasignado.body.organismoId).toBe(otroOrganismoId);
        const enOrigen = await listarResponsables(organismoId).expect(200);
        expect(enOrigen.body.map((r: { id: number }) => r.id)).not.toContain(responsableId);
        const enDestino = await listarResponsables(otroOrganismoId).expect(200);
        expect(enDestino.body.map((r: { id: number }) => r.id)).toEqual([responsableId]);
      });

      it('200: reasignar al mismo organismo es idempotente', async () => {
        const responsableId = await nuevoResponsable();
        await asignar(responsableId, { organismoId }).expect(200);
        const res = await asignar(responsableId, { organismoId }).expect(200);
        expect(res.body.organismoId).toBe(organismoId);
      });

      it('404: responsable inexistente', async () => {
        await asignar(ID_INEXISTENTE, { organismoId }).expect(404);
      });

      it('404: organismo inexistente, sin modificar al responsable', async () => {
        const responsableId = await nuevoResponsable();
        await asignar(responsableId, { organismoId: ID_INEXISTENTE }).expect(404);
        expect(await organismoDe(responsableId)).toBeNull();
      });

      it('409: responsable inactivo, sin modificarlo', async () => {
        const responsableId = await nuevoResponsable();
        await dataSource.query(`UPDATE responsables SET activo = false WHERE id = $1`, [responsableId]);

        await asignar(responsableId, { organismoId }).expect(409);
        expect(await organismoDe(responsableId)).toBeNull();
      });

      it('409: organismo inactivo, sin modificar al responsable', async () => {
        const responsableId = await nuevoResponsable();
        const inactivoId = await nuevoOrganismo();
        await dataSource.query(`UPDATE organismos SET active = false WHERE id = $1`, [inactivoId]);

        await asignar(responsableId, { organismoId: inactivoId }).expect(409);
        expect(await organismoDe(responsableId)).toBeNull();
      });

      it('orden de validacion: el responsable se valida antes que el organismo', async () => {
        const inactivoId = await nuevoResponsable();
        await dataSource.query(`UPDATE responsables SET activo = false WHERE id = $1`, [inactivoId]);

        //responsable inactivo + organismo inexistente => 409 (no 404)
        await asignar(inactivoId, { organismoId: ID_INEXISTENTE }).expect(409);
        //responsable inexistente + organismo inexistente => 404 por el responsable
        const res = await asignar(ID_INEXISTENTE, { organismoId: ID_INEXISTENTE }).expect(404);
        expect(res.body.message).toContain('Responsable');
      });

      it('400: body o id de ruta invalidos', async () => {
        const responsableId = await nuevoResponsable();
        for (const body of [{}, { organismoId: 0 }, { organismoId: -1 }, { organismoId: 1.5 }, { organismoId: '1' }]) {
          await asignar(responsableId, body).expect(400);
        }
        await asignar('abc', { organismoId }).expect(400);
        expect(await organismoDe(responsableId)).toBeNull();
      });
    });
  });
});
