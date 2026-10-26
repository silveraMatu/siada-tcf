import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_AUDITORIA,
  MES_SIN_LIBRO,
  crearResponsableConSesion,
  habilitarUsuario,
  obtenerBearerAdmin,
  obtenerOrganismoBaseId,
  registrarUsuarioConCredenciales,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
describe('Auditoría (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let bearerAdmin: string;
  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  //id de la fila del libro con el saldo equivocado
  let transaccionIncorrectaId: number;

  const ejecutar = (id: number | string) =>
    request(app.getHttpServer()).post(
      `/api/v1/auditoria/cuentas-mensuales/${id}/libro-banco/ejecutar`,
    );
  const listar = (id: number | string) =>
    request(app.getHttpServer()).get(
      `/api/v1/auditoria/cuentas-mensuales/${id}/observaciones`,
    );
  const libros = (id: number) =>
    request(app.getHttpServer())
      .get(`/api/v1/cuentas-mensuales/${id}/libro-banco`)
      .set('Authorization', bearerAdmin);

  //inicia sesión con un usuario nuevo activo y con los roles indicados
  const bearerConRoles = async (roles: string[]): Promise<string> => {
    const usuario = await registrarUsuarioConCredenciales(app);
    await habilitarUsuario(app, usuario.id, roles);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: usuario.email, password: usuario.password })
      .expect(200);
    return `Bearer ${res.body.accessToken}`;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);

    const organismoId = await obtenerOrganismoBaseId(dataSource);
    cuentaMensualId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_AUDITORIA,
    );
    cuentaMensualSinLibroId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_SIN_LIBRO,
    );

    //find-or-create: solo se carga el libro si el mes está vacío (lo carga el responsable del organismo)
    const existentes = await libros(cuentaMensualId).expect(200);
    if (existentes.body.length === 0) {
      const responsable = await crearResponsableConSesion(app, organismoId);
      await request(app.getHttpServer())
        .post(
          `/api/v1/cuentas-mensuales/${cuentaMensualId}/libro-banco/ingestar`,
        )
        .set('Authorization', responsable.bearer)
        .send({
          numeroCuentaCte: '999-AUDITORIA/E2E',
          transacciones: [
            { aLaOrdenDe: 'Base E2E', depositos: 1000, retiro: 0, saldo: 1000 },
            { aLaOrdenDe: 'Cobro E2E', depositos: 500, retiro: 0, saldo: 1500 },
            //debería ser 1300: es la única fila incorrecta
            { aLaOrdenDe: 'Pago E2E', depositos: 0, retiro: 200, saldo: 1400 },
          ],
        })
        .expect(201);
    }
    const [libro] = (await libros(cuentaMensualId).expect(200)).body;
    transaccionIncorrectaId = libro.transacciones[2].id;
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('seguridad', () => {
    it('401: sin token en ambos endpoints', async () => {
      await ejecutar(cuentaMensualId).expect(401);
      await listar(cuentaMensualId).expect(401);
    });

    it('403: un usuario con rol RESPONSABLE no puede auditar ni listar', async () => {
      const bearer = await bearerConRoles(['RESPONSABLE']);

      await ejecutar(cuentaMensualId).set('Authorization', bearer).expect(403);
      await listar(cuentaMensualId).set('Authorization', bearer).expect(403);
    });
  });

  describe('validación de parámetros', () => {
    it('404: la cuenta mensual no existe', async () => {
      await ejecutar(ID_INEXISTENTE)
        .set('Authorization', bearerAdmin)
        .expect(404);
      await listar(ID_INEXISTENTE)
        .set('Authorization', bearerAdmin)
        .expect(404);
    });

    it('400: el ID de la cuenta mensual no es válido', async () => {
      await ejecutar('abc').set('Authorization', bearerAdmin).expect(400);
      await listar('0').set('Authorization', bearerAdmin).expect(400);
    });
  });

  describe('POST .../libro-banco/ejecutar y GET .../observaciones', () => {
    it('200: V3 queda en FALLO con la única fila de saldo incorrecto', async () => {
      const res = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(res.body).toEqual([
        {
          codigoRegla: 'V3',
          descripcion: 'Saldo de cuenta',
          estado: 'FALLO',
          observaciones: [
            {
              id: expect.any(Number),
              cuentaMensualId,
              codigoRegla: 'V3',
              tipo: 'INTERNA',
              descripcion:
                'El saldo calculado (1300.00) no coincide con el saldo informado (1400.00). Diferencia: 100.00.',
              libroOrigen: 'LIBRO_BANCO',
              estado: 'ABIERTA',
              transaccionId: transaccionIncorrectaId,
            },
          ],
        },
      ]);
    });

    it('200: ejecutar de nuevo no duplica la observación', async () => {
      const primera = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);
      const segunda = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(segunda.body).toEqual(primera.body);
      expect(segunda.body[0].observaciones).toHaveLength(1);

      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1 AND codigo_regla = 'V3'`,
        [cuentaMensualId],
      );
      expect(total).toBe(1);
    });

    it('200: un AUDITOR lista las observaciones del mes', async () => {
      const bearer = await bearerConRoles(['AUDITOR']);

      const res = await listar(cuentaMensualId)
        .set('Authorization', bearer)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].transaccionId).toBe(transaccionIncorrectaId);
    });

    it('200: un mes sin libro devuelve FALTAN_LIBROS al ejecutar y lista vacía al listar', async () => {
      const ejecucion = await ejecutar(cuentaMensualSinLibroId)
        .set('Authorization', bearerAdmin)
        .expect(200);
      const listado = await listar(cuentaMensualSinLibroId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(ejecucion.body).toEqual([
        {
          codigoRegla: 'V3',
          descripcion: 'Saldo de cuenta',
          estado: 'FALTAN_LIBROS',
          mensaje: 'Faltan libros requeridos: LIBRO_BANCO',
          observaciones: [],
        },
      ]);
      expect(listado.body).toEqual([]);
    });
  });
});
