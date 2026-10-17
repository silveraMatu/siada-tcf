import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

//Datos y utilidades compartidos por los e2e de varios modulos.
//Los datos no se limpian entre ejecuciones, por eso todo es find-or-create e idempotente.

export const ID_INEXISTENTE = 999999;

export const EJERCICIO = 2026;
export const MES_CON_LIBRO = 3;
export const MES_SIN_LIBRO = 12; //reservado: nunca se ingesta ningun libro en este mes

//organismo inicial que usan los e2e de cuentas, libro-banco y responsables
export async function obtenerOrganismoBaseId(dataSource: DataSource): Promise<number> {
  const nombre = '__E2E__ Organismo Base';
  const existente = await dataSource.query(`SELECT id FROM organismos WHERE nombre = $1 LIMIT 1`, [nombre]);
  if (existente.length) return existente[0].id;

  const [creado] = await dataSource.query(
    `INSERT INTO organismos (nombre, rubro, active) VALUES ($1, 'E2E', true) RETURNING id`,
    [nombre],
  );
  return creado.id;
}

//resuelve (obtiene o crea) la cuenta mensual por el endpoint y devuelve su id
export async function resolverCuentaMensualId(
  app: INestApplication,
  organismoId: number,
  mes: number,
): Promise<number> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/cuentas-mensuales/resolver')
    .send({ organismoId, ejercicioFiscal: EJERCICIO, mes })
    .expect(200);
  return res.body.id;
}
