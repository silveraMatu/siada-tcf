import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import { EJERCICIO, ID_INEXISTENTE, MES_CON_LIBRO, MES_SIN_LIBRO, obtenerOrganismoBaseId } from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Cuentas (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let organismoId: number;
  let cuentaMensualId: number;

  const resolver = (body: unknown) =>
    request(app.getHttpServer()).post('/api/v1/cuentas-mensuales/resolver').send(body as object);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
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
});
