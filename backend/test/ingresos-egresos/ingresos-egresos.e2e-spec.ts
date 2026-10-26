import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_INGRESOS_EGRESOS,
  MES_SIN_LIBRO,
  crearResponsableConSesion,
  crearSesionConRol,
  fijarEstadoCuenta,
  obtenerBearerAdmin,
  obtenerOrganismoAjenoId,
  obtenerOrganismoBaseId,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
//El mes reservado se deja en EN_BORRADOR y sin libro al empezar, así el spec es repetible.
describe('Ingresos y egresos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  let bearerResponsable: string;
  let usuarioResponsableId: number;
  let bearerResponsableAjeno: string;
  let bearerAdmin: string;
  let bearerAuditor: string;
  let bearerJuez: string;

  //una fila completa; `extra` pisa campos puntuales
  const fila = (n: number, extra: Record<string, unknown> = {}) => ({
    fila: n,
    fecha: '2026-03-05',
    concepto: `Concepto ${n}`,
    cajaDebe: 10,
    cajaHaber: 0,
    cajaSaldo: 10,
    bancoDebe: 1234.56,
    bancoHaber: 0,
    bancoSaldo: 1234.56,
    egresoInc1: 0,
    egresoInc2: 0,
    egresoInc3: 0,
    egresoInc4: 0,
    egresoInc5: 0,
    ingresoMunicipal: 1234.56,
    ingresoOtras: 0,
    cuentasVariasDebe: 0,
    cuentasVariasHaber: 0,
    ...extra,
  });
  const cuerpo = (extra: Record<string, unknown> = {}) => ({
    numeroCuentaCte: '12345/6',
    transacciones: [
      fila(1, { cheque: 'CH-1', comprobante: 'C-1' }),
      fila(2, {
        cajaSaldo: -5.5,
        egresoInc3: 99.99,
        cuentasVariasConcepto: 'Retenciones',
        cuentasVariasHaber: 7,
      }),
    ],
    ...extra,
  });

  const ingestar = (
    id: number | string,
    body: unknown,
    bearer: string | null = bearerResponsable,
  ) => {
    const peticion = request(app.getHttpServer()).post(
      `/api/v1/cuentas-mensuales/${id}/ingresos-egresos/ingestar`,
    );
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      body as object,
    );
  };
  const obtener = (
    id: number | string,
    bearer: string | null = bearerResponsable,
  ) => {
    const peticion = request(app.getHttpServer()).get(
      `/api/v1/cuentas-mensuales/${id}/ingresos-egresos`,
    );
    return bearer ? peticion.set('Authorization', bearer) : peticion;
  };

  const contarLibros = async (): Promise<number> => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM ingresos_egresos WHERE cuenta_mensual_id = $1`,
      [cuentaMensualId],
    );
    return total;
  };
  const contarFilas = async (): Promise<number> => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM transacciones_ingresos_egresos t
       JOIN ingresos_egresos i ON i.id = t.ingresos_egresos_id
       WHERE i.cuenta_mensual_id = $1`,
      [cuentaMensualId],
    );
    return total;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);

    const organismoId = await obtenerOrganismoBaseId(dataSource);
    const organismoAjenoId = await obtenerOrganismoAjenoId(dataSource);
    cuentaMensualId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_INGRESOS_EGRESOS,
    );
    cuentaMensualSinLibroId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_SIN_LIBRO,
    );

    const responsable = await crearResponsableConSesion(app, organismoId);
    bearerResponsable = responsable.bearer;
    usuarioResponsableId = responsable.usuarioId;
    bearerResponsableAjeno = (
      await crearResponsableConSesion(app, organismoAjenoId)
    ).bearer;
    bearerAuditor = await crearSesionConRol(app, 'AUDITOR');
    bearerJuez = await crearSesionConRol(app, 'JUEZ_TRAMITE');

    //punto de partida repetible: en borrador y sin libro
    await fijarEstadoCuenta(dataSource, cuentaMensualId);
    await dataSource.query(
      `DELETE FROM ingresos_egresos WHERE cuenta_mensual_id = $1`,
      [cuentaMensualId],
    );
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('seguridad', () => {
    it('401: sin token en ambos endpoints', async () => {
      await ingestar(cuentaMensualId, cuerpo(), null).expect(401);
      await obtener(cuentaMensualId, null).expect(401);
    });

    it('403: ingestar exige el rol RESPONSABLE', async () => {
      await ingestar(cuentaMensualId, cuerpo(), bearerAdmin).expect(403);
      await ingestar(cuentaMensualId, cuerpo(), bearerAuditor).expect(403);
    });

    it('403: un juez de trámite no puede leer el libro', async () => {
      await obtener(cuentaMensualId, bearerJuez).expect(403);
    });

    it('403: el responsable de otro organismo no ingesta ni lee, y no se guarda nada', async () => {
      await ingestar(cuentaMensualId, cuerpo(), bearerResponsableAjeno).expect(
        403,
      );
      await obtener(cuentaMensualId, bearerResponsableAjeno).expect(403);
      expect(await contarLibros()).toBe(0);
    });
  });

  describe('validación', () => {
    it('404: la cuenta mensual no existe', async () => {
      await ingestar(ID_INEXISTENTE, cuerpo()).expect(404);
      await obtener(ID_INEXISTENTE).expect(404);
    });

    it('400: el ID de la cuenta mensual no es válido', async () => {
      await ingestar('abc', cuerpo()).expect(400);
      await ingestar('0', cuerpo()).expect(400);
      await obtener('abc').expect(400);
    });

    it.each([
      ['sin transacciones', { transacciones: [] }],
      ['sin el campo transacciones', { transacciones: undefined }],
      [
        'un importe por encima del tope',
        { transacciones: [fila(1, { bancoDebe: 1_000_000_000_000 })] },
      ],
      ['un debe negativo', { transacciones: [fila(1, { cajaDebe: -1 })] }],
      [
        'una fecha inexistente',
        { transacciones: [fila(1, { fecha: '2026-02-30' })] },
      ],
      [
        'una fecha con otro formato',
        { transacciones: [fila(1, { fecha: '05/03/2026' })] },
      ],
      ['un concepto vacío', { transacciones: [fila(1, { concepto: '' })] }],
      ['una fila 0', { transacciones: [fila(1, { fila: 0 })] }],
      [
        'un saldo ausente',
        { transacciones: [fila(1, { cajaSaldo: undefined })] },
      ],
      [
        'un saldo que no es número',
        { transacciones: [fila(1, { bancoSaldo: '10' })] },
      ],
    ])('400: %s, sin guardar nada', async (_caso, extra) => {
      await ingestar(cuentaMensualId, cuerpo(extra)).expect(400);
      expect(await contarLibros()).toBe(0);
    });
  });

  describe('POST .../ingresos-egresos/ingestar y GET .../ingresos-egresos', () => {
    let libroId: number;
    let cuerpoIngestado: Record<string, unknown>;

    it('201: persiste el libro con todos los campos', async () => {
      const res = await ingestar(cuentaMensualId, cuerpo()).expect(201);
      libroId = res.body.id;

      expect(res.body).toEqual({
        id: expect.any(Number),
        cuentaMensualId,
        numeroCuentaCte: '12345/6',
        fechaCreacion: expect.any(String),
        subidoPorId: usuarioResponsableId,
        hashContenido: expect.stringMatching(/^[0-9a-f]{64}$/),
        transacciones: [
          {
            id: expect.any(Number),
            ...fila(1),
            cheque: 'CH-1',
            comprobante: 'C-1',
            cuentasVariasConcepto: null,
          },
          {
            id: expect.any(Number),
            ...fila(2),
            cajaSaldo: -5.5,
            egresoInc3: 99.99,
            cheque: null,
            comprobante: null,
            cuentasVariasConcepto: 'Retenciones',
            cuentasVariasHaber: 7,
          },
        ],
      });
      expect(res.body.transacciones[0].id).toBeLessThan(
        res.body.transacciones[1].id,
      );
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(2);
      cuerpoIngestado = res.body;
    });

    it('409: ingestar de nuevo responde LIBRO_DUPLICADO y no cambia nada', async () => {
      const res = await ingestar(
        cuentaMensualId,
        cuerpo({ numeroCuentaCte: 'OTRO/1' }),
      ).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        codigo: 'LIBRO_DUPLICADO',
        message: 'Ya existe un libro de ingresos y egresos en esta rendición.',
        libroExistente: {
          id: libroId,
          numeroCuentaCte: '12345/6',
          fechaCreacion: expect.any(String),
          cantidadTransacciones: 2,
        },
      });
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(2);
    });

    it('201: con reemplazar=true sustituye el libro (queda uno solo y sin filas viejas)', async () => {
      const res = await ingestar(
        cuentaMensualId,
        cuerpo({
          numeroCuentaCte: 'NUEVO/9',
          reemplazar: true,
          transacciones: [fila(1), fila(2), fila(3)],
        }),
      ).expect(201);

      expect(res.body.id).not.toBe(libroId);
      expect(res.body.numeroCuentaCte).toBe('NUEVO/9');
      expect(res.body.transacciones).toHaveLength(3);
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(3);

      const [{ viejas }] = await dataSource.query(
        `SELECT count(*)::int AS viejas FROM transacciones_ingresos_egresos WHERE ingresos_egresos_id = $1`,
        [libroId],
      );
      expect(viejas).toBe(0);
      libroId = res.body.id;
    });

    it('201: sin N° de cuenta corriente ni importes opcionales usa null y 0', async () => {
      const minimo = {
        fila: 1,
        fecha: '2026-03-01',
        concepto: 'Mínimo',
        cajaSaldo: 0,
        bancoSaldo: 0,
      };

      const res = await ingestar(cuentaMensualId, {
        reemplazar: true,
        numeroCuentaCte: '   ',
        transacciones: [minimo],
      }).expect(201);
      libroId = res.body.id;

      expect(res.body.numeroCuentaCte).toBeNull();
      expect(res.body.transacciones[0]).toEqual({
        id: expect.any(Number),
        ...fila(1, { fecha: '2026-03-01', concepto: 'Mínimo' }),
        cajaDebe: 0,
        cajaSaldo: 0,
        bancoDebe: 0,
        bancoSaldo: 0,
        ingresoMunicipal: 0,
        cheque: null,
        comprobante: null,
        cuentasVariasConcepto: null,
      });
    });

    it('GET 200: el responsable dueño, un ADMIN y un AUDITOR leen el mismo libro', async () => {
      //se deja un libro conocido para comparar
      const ingestado = await ingestar(
        cuentaMensualId,
        cuerpo({ reemplazar: true }),
      ).expect(201);
      libroId = ingestado.body.id;

      for (const bearer of [bearerResponsable, bearerAdmin, bearerAuditor]) {
        const res = await obtener(cuentaMensualId, bearer).expect(200);
        expect(res.body).toEqual(ingestado.body);
      }
      expect(cuerpoIngestado.numeroCuentaCte).toBe('12345/6');
    });

    it('GET 404: la cuenta existe pero no tiene libro cargado', async () => {
      const res = await obtener(cuentaMensualSinLibroId, bearerAdmin).expect(
        404,
      );

      expect(res.body.message).toContain('no tiene un libro de ingresos');
    });

    it('409: dos cargas simultáneas sin libro previo: una gana y la otra recibe LIBRO_DUPLICADO', async () => {
      await dataSource.query(
        `DELETE FROM ingresos_egresos WHERE cuenta_mensual_id = $1`,
        [cuentaMensualId],
      );

      const respuestas = await Promise.all([
        ingestar(cuentaMensualId, cuerpo()),
        ingestar(cuentaMensualId, cuerpo()),
      ]);

      expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      const perdedora = respuestas.find((r) => r.status === 409)!;
      expect(perdedora.body.codigo).toBe('LIBRO_DUPLICADO');
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(2);
    });
  });

  describe('candado de estado', () => {
    afterAll(async () => {
      await fijarEstadoCuenta(dataSource, cuentaMensualId);
    });

    it('409: una cuenta ya enviada a auditoría no admite ingestar ni reemplazar', async () => {
      await fijarEstadoCuenta(
        dataSource,
        cuentaMensualId,
        'LISTO_PARA_AUDITAR',
      );
      const filasAntes = await contarFilas();

      const mensaje =
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.';
      const res = await ingestar(cuentaMensualId, cuerpo()).expect(409);
      const reemplazo = await ingestar(
        cuentaMensualId,
        cuerpo({ reemplazar: true }),
      ).expect(409);

      expect(res.body.message).toBe(mensaje);
      expect(reemplazo.body.message).toBe(mensaje);
      expect(await contarFilas()).toBe(filasAntes);
    });

    it('GET 200: el libro de una cuenta ya presentada se sigue pudiendo leer', async () => {
      await fijarEstadoCuenta(
        dataSource,
        cuentaMensualId,
        'LISTO_PARA_AUDITAR',
      );

      await obtener(cuentaMensualId, bearerAuditor).expect(200);
    });
  });

  describe('volumen', () => {
    it('201: un libro de 4000 filas (más de 100kb de JSON y más de 65535 parámetros juntos) se guarda por lotes', async () => {
      await fijarEstadoCuenta(dataSource, cuentaMensualId);
      const filas = Array.from({ length: 4000 }, (_, i) => fila(i + 1));

      const res = await ingestar(
        cuentaMensualId,
        cuerpo({ reemplazar: true, transacciones: filas }),
      ).expect(201);

      expect(res.body.transacciones).toHaveLength(4000);
      expect(res.body.transacciones[3999].fila).toBe(4000);
      expect(await contarFilas()).toBe(4000);
    }, 60_000);
  });
});
