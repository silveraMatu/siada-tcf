import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  EJERCICIO,
  ID_INEXISTENTE,
  MES_CON_LIBRO,
  MES_PRESENTAR,
  MES_SIN_LIBRO,
  crearResponsableConSesion,
  fijarEstadoCuenta,
  habilitarUsuario,
  obtenerBearerAdmin,
  obtenerOrganismoAjenoId,
  obtenerOrganismoBaseId,
  registrarUsuarioConCredenciales,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Cuentas (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let organismoId: number;
  let cuentaMensualId: number;
  let bearerAdmin: string;

  const resolver = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/v1/cuentas-mensuales/resolver')
      .send(body as object);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
    bearerAdmin = await obtenerBearerAdmin(app);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /cuentas-mensuales/resolver', () => {
    it('200: crea o resuelve la jerarquia cuenta anual / mensual', async () => {
      const res = await resolver({
        organismoId,
        ejercicioFiscal: EJERCICIO,
        mes: MES_CON_LIBRO,
      }).expect(200);

      expect(res.body).toMatchObject({
        mes: MES_CON_LIBRO,
        estado: 'EN_BORRADOR',
      });
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.cuentaAnualId).toEqual(expect.any(Number));
      cuentaMensualId = res.body.id;

      const [anual] = await dataSource.query(
        `SELECT * FROM cuentas_anuales WHERE id = $1`,
        [res.body.cuentaAnualId],
      );
      expect(anual).toMatchObject({
        organismo_id: organismoId,
        ejercicio_fiscal: EJERCICIO,
      });
    });

    it('200: es idempotente (misma cuenta mensual en llamadas repetidas)', async () => {
      const res = await resolver({
        organismoId,
        ejercicioFiscal: EJERCICIO,
        mes: MES_CON_LIBRO,
      }).expect(200);
      expect(res.body.id).toBe(cuentaMensualId);
    });

    it('200: resuelve la cuenta mensual reservada sin libros', async () => {
      const res = await resolver({
        organismoId,
        ejercicioFiscal: EJERCICIO,
        mes: MES_SIN_LIBRO,
      }).expect(200);
      expect(res.body.id).not.toBe(cuentaMensualId);
    });

    it.each([
      ['mes 13', { ejercicioFiscal: EJERCICIO, mes: 13 }],
      ['mes 0', { ejercicioFiscal: EJERCICIO, mes: 0 }],
      ['mes decimal', { ejercicioFiscal: EJERCICIO, mes: 1.5 }],
      ['ejercicio fuera de rango', { ejercicioFiscal: 1999, mes: 3 }],
      [
        'organismoId negativo',
        { organismoId: -1, ejercicioFiscal: EJERCICIO, mes: 3 },
      ],
      [
        'organismoId como string',
        { organismoId: '1', ejercicioFiscal: EJERCICIO, mes: 3 },
      ],
      [
        'organismoId fuera de rango int4',
        { organismoId: 99999999999, ejercicioFiscal: EJERCICIO, mes: 3 },
      ],
      ['body vacio', {}],
    ])('400: %s', async (_caso, parcial) => {
      await resolver({ organismoId, ...parcial }).expect(400);
    });

    it('404: organismo inexistente', async () => {
      await resolver({
        organismoId: ID_INEXISTENTE,
        ejercicioFiscal: EJERCICIO,
        mes: 3,
      }).expect(404);
    });
  });
  describe('PATCH /cuentas-mensuales/:id/presentar', () => {
    let cuentaPresentarId: number;

    const presentar = (id: number | string, bearer?: string) => {
      const peticion = request(app.getHttpServer()).patch(
        `/api/v1/cuentas-mensuales/${id}/presentar`,
      );
      return bearer ? peticion.set('Authorization', bearer) : peticion;
    };
    const estadoEnBase = async (id: number): Promise<string> => {
      const [fila] = await dataSource.query(
        `SELECT estado FROM cuentas_mensuales WHERE id = $1`,
        [id],
      );
      return fila.estado;
    };

    beforeAll(async () => {
      const res = await resolver({
        organismoId,
        ejercicioFiscal: EJERCICIO,
        mes: MES_PRESENTAR,
      }).expect(200);
      cuentaPresentarId = res.body.id;
      //la presentacion no se deshace por la API: cada corrida parte de EN_BORRADOR
      await fijarEstadoCuenta(dataSource, cuentaPresentarId);
    });

    it('401: sin token', async () => {
      await presentar(cuentaPresentarId).expect(401);
    });

    it('403: un ADMIN no puede presentar (requiere el rol RESPONSABLE)', async () => {
      await presentar(cuentaPresentarId, bearerAdmin).expect(403);
      expect(await estadoEnBase(cuentaPresentarId)).toBe('EN_BORRADOR');
    });

    it('403: el responsable de otro organismo no puede presentar la cuenta', async () => {
      const ajeno = await crearResponsableConSesion(
        app,
        await obtenerOrganismoAjenoId(dataSource),
      );

      await presentar(cuentaPresentarId, ajeno.bearer).expect(403);
      expect(await estadoEnBase(cuentaPresentarId)).toBe('EN_BORRADOR');
    });

    it('403: un usuario RESPONSABLE sin perfil de responsable no puede presentar', async () => {
      const { id, email, password } =
        await registrarUsuarioConCredenciales(app);
      await habilitarUsuario(app, id, ['RESPONSABLE']);
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      await presentar(
        cuentaPresentarId,
        `Bearer ${login.body.accessToken}`,
      ).expect(403);
    });

    it('404: la cuenta mensual no existe', async () => {
      const propio = await crearResponsableConSesion(app, organismoId);

      await presentar(ID_INEXISTENTE, propio.bearer).expect(404);
    });

    it('400: el ID no es valido', async () => {
      const propio = await crearResponsableConSesion(app, organismoId);

      await presentar('abc', propio.bearer).expect(400);
      await presentar('0', propio.bearer).expect(400);
    });

    it('200: el responsable del organismo presenta la cuenta y pasa a LISTO_PARA_AUDITAR', async () => {
      const propio = await crearResponsableConSesion(app, organismoId);

      const res = await presentar(cuentaPresentarId, propio.bearer).expect(200);

      expect(res.body).toMatchObject({
        id: cuentaPresentarId,
        mes: MES_PRESENTAR,
        estado: 'LISTO_PARA_AUDITAR',
      });
      expect(await estadoEnBase(cuentaPresentarId)).toBe('LISTO_PARA_AUDITAR');
    });

    it('409: presentarla de nuevo falla y no cambia el estado', async () => {
      const propio = await crearResponsableConSesion(app, organismoId);

      const res = await presentar(cuentaPresentarId, propio.bearer).expect(409);

      expect(res.body.message).toBe('La cuenta ya fue presentada');
      expect(await estadoEnBase(cuentaPresentarId)).toBe('LISTO_PARA_AUDITAR');
    });

    describe('GET /cuentas-mensuales?estado=', () => {
      const listar = (query = '', bearer?: string) => {
        const peticion = request(app.getHttpServer()).get(
          `/api/v1/cuentas-mensuales${query}`,
        );
        return bearer ? peticion.set('Authorization', bearer) : peticion;
      };
      const ids = (cuentas: { id: number }[]) => cuentas.map((c) => c.id);

      it('401: sin token', async () => {
        await listar().expect(401);
      });

      it('403: un RESPONSABLE no puede listar', async () => {
        const propio = await crearResponsableConSesion(app, organismoId);

        await listar('', propio.bearer).expect(403);
      });

      it('200: sin filtro trae todas, con el estado de cada una', async () => {
        const res = await listar('', bearerAdmin).expect(200);

        const presentada = res.body.find(
          (c: { id: number }) => c.id === cuentaPresentarId,
        );
        expect(presentada).toMatchObject({ estado: 'LISTO_PARA_AUDITAR' });
      });

      it('200: ?estado=LISTO_PARA_AUDITAR trae solo las presentadas (un AUDITOR puede)', async () => {
        const auditor = await registrarUsuarioConCredenciales(app);
        await habilitarUsuario(app, auditor.id, ['AUDITOR']);
        const login = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: auditor.email, password: auditor.password })
          .expect(200);

        const res = await listar(
          '?estado=LISTO_PARA_AUDITAR',
          `Bearer ${login.body.accessToken}`,
        ).expect(200);

        expect(ids(res.body)).toContain(cuentaPresentarId);
        for (const cuenta of res.body)
          expect(cuenta.estado).toBe('LISTO_PARA_AUDITAR');
      });

      it('200: ?estado=EN_BORRADOR no incluye la cuenta presentada', async () => {
        const res = await listar('?estado=EN_BORRADOR', bearerAdmin).expect(
          200,
        );

        expect(ids(res.body)).not.toContain(cuentaPresentarId);
        for (const cuenta of res.body)
          expect(cuenta.estado).toBe('EN_BORRADOR');
      });

      it('400: estado invalido', async () => {
        await listar('?estado=xxx', bearerAdmin).expect(400);
        await listar('?estado=en_borrador', bearerAdmin).expect(400);
      });
    });
  });
});
