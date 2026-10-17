import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import { ID_INEXISTENTE, obtenerOrganismoBaseId } from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Responsables (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let organismoId: number;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

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
