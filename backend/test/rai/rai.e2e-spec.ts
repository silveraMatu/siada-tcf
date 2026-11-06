import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_SIN_LIBRO,
  crearResponsableConSesion,
  crearAuditorConSesion,
  crearSesionConRol,
  fijarEstadoCuenta,
  obtenerBearerAdmin,
  obtenerOrganismoAjenoId,
  obtenerOrganismoBaseId,
  obtenerOrganismoRaiId,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

//Corre contra la base de datos real y NO limpia lo que crea: los datos quedan persistidos.
//Usa un organismo propio (su mes 1 no lo toca ningún otro spec) y lo deja en EN_BORRADOR y sin libro al empezar,
//así el spec es repetible.
describe('RAI (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  let organismoId: number;
  let bearerResponsable: string;
  let usuarioResponsableId: number;
  let bearerResponsableAjeno: string;
  let bearerAdmin: string;
  let bearerAuditor: string;
  let bearerAuditorSinAsignar: string;
  let bearerJuez: string;

  //un asiento completo; `extra` pisa campos puntuales
  const asiento = (n: number, extra: Record<string, unknown> = {}) => ({
    fecha: '2026-01-05',
    concepto: `Concepto ${n}`,
    ingresosDiarios: 1234.56,
    ingresosMensuales: 1234.56,
    ingresosAcumulados: 491534.56,
    saldo: 754308465.44,
    ...extra,
  });
  const cuerpo = (extra: Record<string, unknown> = {}) => ({
    transacciones: [
      asiento(1, { asiento: 1, planillaNumero: 'PL-1' }),
      asiento(2, { ingresosMensuales: 2469.12, saldo: -5.5 }),
    ],
    ...extra,
  });

  const ingestar = (
    id: number | string,
    body: unknown,
    bearer: string | null = bearerResponsable,
  ) => {
    const peticion = request(app.getHttpServer()).post(
      `/api/v1/cuentas-mensuales/${id}/rai/ingestar`,
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
      `/api/v1/cuentas-mensuales/${id}/rai`,
    );
    return bearer ? peticion.set('Authorization', bearer) : peticion;
  };

  const contarLibros = async (): Promise<number> => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM rai WHERE cuenta_mensual_id = $1`,
      [cuentaMensualId],
    );
    return total;
  };
  const contarFilas = async (): Promise<number> => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM transacciones_rai t
       JOIN rai r ON r.id = t.rai_id
       WHERE r.cuenta_mensual_id = $1`,
      [cuentaMensualId],
    );
    return total;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);

    organismoId = await obtenerOrganismoRaiId(dataSource);
    const organismoAjenoId = await obtenerOrganismoAjenoId(dataSource);
    cuentaMensualId = await resolverCuentaMensualId(app, organismoId, 1);
    //una cuenta que nunca recibe libros
    cuentaMensualSinLibroId = await resolverCuentaMensualId(
      app,
      await obtenerOrganismoBaseId(dataSource),
      MES_SIN_LIBRO,
    );

    const responsable = await crearResponsableConSesion(app, organismoId);
    bearerResponsable = responsable.bearer;
    usuarioResponsableId = responsable.usuarioId;
    bearerResponsableAjeno = (
      await crearResponsableConSesion(app, organismoAjenoId)
    ).bearer;
    //el auditor asignado al organismo y otro sin ninguna asignación
    bearerAuditor = (await crearAuditorConSesion(app, organismoId)).bearer;
    bearerAuditorSinAsignar = (await crearAuditorConSesion(app)).bearer;
    bearerJuez = await crearSesionConRol(app, 'JUEZ_TRAMITE');

    //punto de partida repetible: en borrador y sin libro
    await fijarEstadoCuenta(dataSource, cuentaMensualId);
    await dataSource.query(`DELETE FROM rai WHERE cuenta_mensual_id = $1`, [
      cuentaMensualId,
    ]);
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

    it('403: un auditor sin el organismo asignado no puede leer el libro', async () => {
      await obtener(cuentaMensualId, bearerAuditorSinAsignar).expect(403);
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
        {
          transacciones: [asiento(1, { ingresosDiarios: 1_000_000_000_000 })],
        },
      ],
      [
        'un ingreso diario negativo',
        { transacciones: [asiento(1, { ingresosDiarios: -1 })] },
      ],
      [
        'una fecha inexistente',
        { transacciones: [asiento(1, { fecha: '2026-02-30' })] },
      ],
      [
        'una fecha con otro formato',
        { transacciones: [asiento(1, { fecha: '05/01/2026' })] },
      ],
      ['un concepto vacío', { transacciones: [asiento(1, { concepto: '' })] }],
      ['un asiento 0', { transacciones: [asiento(1, { asiento: 0 })] }],
      [
        'un ingreso mensual ausente',
        { transacciones: [asiento(1, { ingresosMensuales: undefined })] },
      ],
      [
        'un acumulado ausente',
        { transacciones: [asiento(1, { ingresosAcumulados: undefined })] },
      ],
      [
        'un saldo ausente',
        { transacciones: [asiento(1, { saldo: undefined })] },
      ],
      [
        'un saldo que no es número',
        { transacciones: [asiento(1, { saldo: '10' })] },
      ],
    ])('400: %s, sin guardar nada', async (_caso, extra) => {
      await ingestar(cuentaMensualId, cuerpo(extra)).expect(400);
      expect(await contarLibros()).toBe(0);
    });
  });

  describe('POST .../rai/ingestar y GET .../rai', () => {
    let libroId: number;

    it('201: persiste el libro con todos los campos', async () => {
      const res = await ingestar(cuentaMensualId, cuerpo()).expect(201);
      libroId = res.body.id;

      expect(res.body).toEqual({
        id: expect.any(Number),
        cuentaMensualId,
        fechaCreacion: expect.any(String),
        subidoPorId: usuarioResponsableId,
        //nombre y apellido, nada más (sin DNI, email ni contraseña)
        subidoPor: {
          id: usuarioResponsableId,
          nombre: 'Fixture',
          apellido: 'E2E',
        },
        hashContenido: expect.stringMatching(/^[0-9a-f]{64}$/),
        transacciones: [
          {
            id: expect.any(Number),
            ...asiento(1),
            asiento: 1,
            planillaNumero: 'PL-1',
          },
          {
            id: expect.any(Number),
            ...asiento(2),
            ingresosMensuales: 2469.12,
            saldo: -5.5,
            asiento: null,
            planillaNumero: null,
          },
        ],
      });
      expect(res.body.transacciones[0].id).toBeLessThan(
        res.body.transacciones[1].id,
      );
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(2);
    });

    it('queda en la bitácora con la cuenta, el organismo y la cantidad de asientos', async () => {
      const [evento] = await dataSource.query(
        `SELECT * FROM registro_actividad
         WHERE accion = 'RAI_CARGADO' AND cuenta_mensual_id = $1 AND usuario_id = $2
         ORDER BY id DESC LIMIT 1`,
        [cuentaMensualId, usuarioResponsableId],
      );

      expect(evento).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 201,
        organismo_id: organismoId,
        detalle: {
          filas: 2,
          reemplazoSolicitado: false,
          hashContenido: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      });
    });

    it('409: ingestar de nuevo responde LIBRO_DUPLICADO y no cambia nada', async () => {
      const res = await ingestar(
        cuentaMensualId,
        cuerpo({ transacciones: [asiento(9)] }),
      ).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        codigo: 'LIBRO_DUPLICADO',
        message: 'Ya existe un libro RAI en esta rendición.',
        libroExistente: {
          id: libroId,
          numeroCuentaCte: null,
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
          reemplazar: true,
          transacciones: [asiento(1), asiento(2), asiento(3)],
        }),
      ).expect(201);

      expect(res.body.id).not.toBe(libroId);
      expect(res.body.transacciones).toHaveLength(3);
      expect(await contarLibros()).toBe(1);
      expect(await contarFilas()).toBe(3);

      const [{ viejas }] = await dataSource.query(
        `SELECT count(*)::int AS viejas FROM transacciones_rai WHERE rai_id = $1`,
        [libroId],
      );
      expect(viejas).toBe(0);
      libroId = res.body.id;
    });

    it('201: sin ingreso diario ni textos opcionales usa 0 y null', async () => {
      const minimo = {
        fecha: '2026-01-01',
        concepto: 'Mínimo',
        ingresosMensuales: 0,
        ingresosAcumulados: 0,
        saldo: 0,
      };

      const res = await ingestar(cuentaMensualId, {
        reemplazar: true,
        transacciones: [{ ...minimo, planillaNumero: '   ' }],
      }).expect(201);
      libroId = res.body.id;

      expect(res.body.transacciones[0]).toEqual({
        id: expect.any(Number),
        ...minimo,
        ingresosDiarios: 0,
        asiento: null,
        planillaNumero: null,
      });
    });

    it('GET 200: el responsable dueño, un ADMIN y un AUDITOR leen el mismo libro', async () => {
      //se deja un libro conocido para comparar
      const ingestado = await ingestar(
        cuentaMensualId,
        cuerpo({ reemplazar: true }),
      ).expect(201);

      for (const bearer of [bearerResponsable, bearerAdmin, bearerAuditor]) {
        const res = await obtener(cuentaMensualId, bearer).expect(200);
        expect(res.body).toEqual(ingestado.body);
      }
    });

    it('GET 404: la cuenta existe pero no tiene libro cargado', async () => {
      const res = await obtener(cuentaMensualSinLibroId, bearerAdmin).expect(
        404,
      );

      expect(res.body.message).toContain('no tiene un libro RAI');
    });

    it('409: dos cargas simultáneas sin libro previo: una gana y la otra recibe LIBRO_DUPLICADO', async () => {
      await dataSource.query(`DELETE FROM rai WHERE cuenta_mensual_id = $1`, [
        cuentaMensualId,
      ]);

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

  describe('lo ve el listado de cuentas y no condiciona presentar', () => {
    it('el resumen de libros de la cuenta incluye el RAI al final, sin N° de cuenta corriente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cuentas-mensuales')
        .query({ estado: 'EN_BORRADOR' })
        .set('Authorization', bearerAdmin)
        .expect(200);

      const cuenta = res.body.find(
        (c: { id: number }) => c.id === cuentaMensualId,
      );
      expect(cuenta.libros.at(-1)).toMatchObject({
        tipo: 'RAI',
        numeroCuentaCte: null,
        cantidadTransacciones: 2,
        fechaDesde: '2026-01-05',
        fechaHasta: '2026-01-05',
      });
    });

    it('es opcional: presentar sigue pidiendo solo Libro Banco e Ingresos y Egresos', async () => {
      //esta cuenta ya tiene RAI pero no banco ni I/E
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/cuentas-mensuales/${cuentaMensualId}/presentar`)
        .set('Authorization', bearerResponsable)
        .expect(409);

      expect(res.body.message).toBe(
        'Faltan documentos para presentar la rendición: Libro Banco, Ingresos y Egresos.',
      );
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
    it('201: un libro de 4000 asientos (más de 100kb de JSON) se guarda por lotes', async () => {
      await fijarEstadoCuenta(dataSource, cuentaMensualId);
      const filas = Array.from({ length: 4000 }, (_, i) =>
        asiento(i + 1, { asiento: i + 1 }),
      );

      const res = await ingestar(
        cuentaMensualId,
        cuerpo({ reemplazar: true, transacciones: filas }),
      ).expect(201);

      expect(res.body.transacciones).toHaveLength(4000);
      expect(res.body.transacciones[3999].asiento).toBe(4000);
      expect(await contarFilas()).toBe(4000);
    }, 60_000);
  });
});
