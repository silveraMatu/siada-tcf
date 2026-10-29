import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CLAVE_SEED,
  NOMBRE_ORGANISMO_SEED,
  USUARIOS_SEED,
  sembrar,
} from '../../src/cli/seed.js';
import { createTestApp } from '../helpers/create-test-app.js';

//Corre contra la base de datos real y NO limpia lo que crea: es la misma siembra que usa el desarrollo.
describe('Script seed (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('siembra usuarios, organismo, responsable, auditor y rendiciones, y se puede repetir', async () => {
    const primera = await sembrar(app);
    const segunda = await sembrar(app);

    //idempotente: la segunda corrida encuentra todo lo de la primera
    expect(segunda.organismoId).toBe(primera.organismoId);
    expect(segunda.usuarios).toEqual(primera.usuarios);
    expect(segunda.meses.map((m) => m.cuentaId)).toEqual(
      primera.meses.map((m) => m.cuentaId),
    );

    const organismos = await dataSource.query(
      `SELECT id FROM organismos WHERE nombre = $1`,
      [NOMBRE_ORGANISMO_SEED],
    );
    expect(organismos).toHaveLength(1);

    const auditor = primera.usuarios.find((u) => u.email.includes('auditor'))!;
    const [{ auditor_id }] = await dataSource.query(
      `SELECT auditor_id FROM organismos WHERE id = $1`,
      [primera.organismoId],
    );
    expect(auditor_id).toBe(auditor.id);

    //cada usuario sembrado puede iniciar sesión con la clave del seed
    for (const { email } of USUARIOS_SEED) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: CLAVE_SEED })
        .expect(200);
    }

    //todas las rendiciones tienen sus libros; los meses 2 y 3 ya no están en borrador
    for (const { cuentaId, mes } of primera.meses) {
      const [{ estado }] = await dataSource.query(
        `SELECT estado FROM cuentas_mensuales WHERE id = $1`,
        [cuentaId],
      );
      const [{ banco }] = await dataSource.query(
        `SELECT count(*)::int AS banco FROM libros_banco WHERE cuenta_mensual_id = $1`,
        [cuentaId],
      );
      const [{ ie }] = await dataSource.query(
        `SELECT count(*)::int AS ie FROM ingresos_egresos WHERE cuenta_mensual_id = $1`,
        [cuentaId],
      );
      expect(banco).toBe(mes === 2 ? 2 : 1);
      expect(ie).toBe(1);
      if (mes !== 1) expect(estado).not.toBe('EN_BORRADOR');
    }
  });
});
