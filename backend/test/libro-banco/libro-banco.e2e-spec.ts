import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_CON_LIBRO,
  MES_PRESENTAR,
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
//Los N° de cuenta corriente llevan un sufijo por ejecución: son únicos por rendición y los libros se acumulan.
describe('Libro banco (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let cuentaMensualId: number;
  let cuentaMensualSinLibroId: number;
  let libroIngestadoId: number;
  let bearerResponsable: string;
  let bearerResponsableAjeno: string;
  let bearerAdmin: string;
  let bearerAuditor: string;
  let bearerJuez: string;

  const corrida = Date.now();
  const numero = (nombre: string) => `E2E-${corrida}/${nombre}`;
  const NUMERO_PRINCIPAL = numero('PRINCIPAL');

  const ingestar = (
    id: number | string,
    body: unknown,
    bearer: string | null = bearerResponsable,
  ) => {
    const peticion = request(app.getHttpServer()).post(
      `/api/v1/cuentas-mensuales/${id}/libro-banco/ingestar`,
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
      `/api/v1/cuentas-mensuales/${id}/libro-banco`,
    );
    return bearer ? peticion.set('Authorization', bearer) : peticion;
  };
  const contarLibrosConNumero = async (
    cuentaId: number,
    numeroCuenta: string,
  ): Promise<number> => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM libros_banco WHERE cuenta_mensual_id = $1 AND numero_cuenta_cte = $2`,
      [cuentaId, numeroCuenta],
    );
    return total;
  };

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
  const cuerpo = (numeroCuentaCte: string, extra: object = {}) => ({
    numeroCuentaCte,
    transacciones: transaccionesValidas(),
    ...extra,
  });

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

    bearerResponsable = (await crearResponsableConSesion(app, organismoId))
      .bearer;
    bearerResponsableAjeno = (
      await crearResponsableConSesion(
        app,
        await obtenerOrganismoAjenoId(dataSource),
      )
    ).bearer;
    bearerAdmin = await obtenerBearerAdmin(app);
    bearerAuditor = await crearSesionConRol(app, 'AUDITOR');
    bearerJuez = await crearSesionConRol(app, 'JUEZ_TRAMITE');
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('POST /cuentas-mensuales/:cuentaMensualId/libro-banco/ingestar', () => {
    it('201: guarda el libro con sus transacciones', async () => {
      const res = await ingestar(
        cuentaMensualId,
        cuerpo(NUMERO_PRINCIPAL),
      ).expect(201);

      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.cuentaMensualId).toBe(cuentaMensualId);
      expect(res.body.numeroCuentaCte).toBe(NUMERO_PRINCIPAL);
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

    it('201: recorta los espacios del N° de cuenta corriente', async () => {
      const res = await ingestar(
        cuentaMensualId,
        cuerpo(`   ${numero('ESPACIOS')}   `),
      ).expect(201);

      expect(res.body.numeroCuentaCte).toBe(numero('ESPACIOS'));
    });

    it('404: cuenta mensual inexistente', async () => {
      await ingestar(ID_INEXISTENTE, cuerpo(numero('404'))).expect(404);
    });

    it.each([
      ['lista de transacciones vacia', { transacciones: [] }],
      ['sin transacciones', { transacciones: undefined }],
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
      ['reemplazar que no es booleano', { reemplazar: 'si' }],
    ])('400: %s', async (_caso, extra) => {
      await ingestar(cuentaMensualId, {
        numeroCuentaCte: numero('400'),
        transacciones: transaccionesValidas(),
        ...extra,
      }).expect(400);
    });

    it.each([
      ['sin N° de cuenta corriente', {}],
      ['N° de cuenta corriente vacío', { numeroCuentaCte: '' }],
      ['N° de cuenta corriente solo con espacios', { numeroCuentaCte: '   ' }],
      ['N° de cuenta corriente que no es texto', { numeroCuentaCte: 123 }],
    ])('400: %s', async (_caso, extra) => {
      await ingestar(cuentaMensualId, {
        transacciones: transaccionesValidas(),
        ...extra,
      }).expect(400);
    });

    it('400: id de cuenta mensual invalido', async () => {
      await ingestar('abc', cuerpo(numero('400-id'))).expect(400);
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

      const res = await ingestar(cuentaMensualId, {
        numeroCuentaCte: numero('GRANDE'),
        transacciones,
      }).expect(201);

      expect(res.body.transacciones).toHaveLength(1000);
    });

    it('413: rechaza bodies de más de 10mb', async () => {
      await ingestar(cuentaMensualId, {
        numeroCuentaCte: 'x'.repeat(11 * 1024 * 1024),
        transacciones: transaccionesValidas(),
      }).expect(413);
    });

    describe('autorización', () => {
      it('401: sin token', async () => {
        const antes = await contarLibrosConNumero(
          cuentaMensualId,
          numero('SIN-TOKEN'),
        );

        await ingestar(
          cuentaMensualId,
          cuerpo(numero('SIN-TOKEN')),
          null,
        ).expect(401);

        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('SIN-TOKEN')),
        ).toBe(antes);
      });

      it('403: un responsable de otro organismo no puede cargar libros', async () => {
        await ingestar(
          cuentaMensualId,
          cuerpo(numero('AJENO')),
          bearerResponsableAjeno,
        ).expect(403);

        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('AJENO')),
        ).toBe(0);
      });

      it.each([
        ['ADMIN', () => bearerAdmin],
        ['AUDITOR', () => bearerAuditor],
        ['JUEZ_TRAMITE', () => bearerJuez],
      ])('403: el rol %s no puede cargar libros', async (rol, bearer) => {
        await ingestar(
          cuentaMensualId,
          cuerpo(numero(`ROL-${rol}`)),
          bearer(),
        ).expect(403);

        expect(
          await contarLibrosConNumero(cuentaMensualId, numero(`ROL-${rol}`)),
        ).toBe(0);
      });
    });

    describe('un solo libro por N° de cuenta corriente', () => {
      it('409 LIBRO_DUPLICADO: el mismo N° se rechaza y no cambia lo ya cargado', async () => {
        const original = await ingestar(
          cuentaMensualId,
          cuerpo(numero('DUPLICADO')),
        ).expect(201);

        const res = await ingestar(
          cuentaMensualId,
          cuerpo(numero('DUPLICADO'), {
            transacciones: [
              { aLaOrdenDe: 'Otra', depositos: 5, retiro: 0, saldo: 5 },
            ],
          }),
        ).expect(409);

        expect(res.body).toMatchObject({
          statusCode: 409,
          codigo: 'LIBRO_DUPLICADO',
          libroExistente: {
            id: original.body.id,
            numeroCuentaCte: numero('DUPLICADO'),
            cantidadTransacciones: 2,
            fechaCreacion: expect.any(String),
          },
        });
        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('DUPLICADO')),
        ).toBe(1);
        const [{ n }] = await dataSource.query(
          `SELECT count(*)::int AS n FROM transacciones_libro_banco WHERE libro_banco_id = $1`,
          [original.body.id],
        );
        expect(n).toBe(2);
      });

      it('201: con reemplazar=true el libro viejo se sustituye por el nuevo', async () => {
        const original = await ingestar(
          cuentaMensualId,
          cuerpo(numero('REEMPLAZO')),
        ).expect(201);

        const res = await ingestar(
          cuentaMensualId,
          cuerpo(numero('REEMPLAZO'), {
            reemplazar: true,
            transacciones: [
              { aLaOrdenDe: 'Nueva 1', depositos: 5, retiro: 0, saldo: 5 },
              { aLaOrdenDe: 'Nueva 2', depositos: 5, retiro: 0, saldo: 10 },
              { aLaOrdenDe: 'Nueva 3', depositos: 5, retiro: 0, saldo: 15 },
            ],
          }),
        ).expect(201);

        expect(res.body.id).not.toBe(original.body.id);
        expect(res.body.transacciones).toHaveLength(3);
        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('REEMPLAZO')),
        ).toBe(1);
        //el libro viejo y sus transacciones ya no existen
        const [viejo] = await dataSource.query(
          `SELECT (SELECT count(*)::int FROM libros_banco WHERE id = $1) AS libros,
                  (SELECT count(*)::int FROM transacciones_libro_banco WHERE libro_banco_id = $1) AS transacciones`,
          [original.body.id],
        );
        expect(viejo).toEqual({ libros: 0, transacciones: 0 });
      });

      it('GET: tras reemplazar, las transacciones se devuelven en el orden del archivo', async () => {
        const filas = (prefijo: string) =>
          Array.from({ length: 40 }, (_, i) => ({
            aLaOrdenDe: `${prefijo} ${String(i).padStart(2, '0')}`,
            depositos: 1,
            retiro: 0,
            saldo: i + 1,
          }));
        await ingestar(
          cuentaMensualId,
          cuerpo(numero('ORDEN'), { transacciones: filas('Vieja') }),
        ).expect(201);
        await ingestar(
          cuentaMensualId,
          cuerpo(numero('ORDEN'), {
            reemplazar: true,
            transacciones: filas('Nueva'),
          }),
        ).expect(201);

        const res = await obtener(cuentaMensualId).expect(200);

        const libro = res.body.find(
          (l: { numeroCuentaCte: string }) =>
            l.numeroCuentaCte === numero('ORDEN'),
        );
        expect(
          libro.transacciones.map((t: { aLaOrdenDe: string }) => t.aLaOrdenDe),
        ).toEqual(filas('Nueva').map((t) => t.aLaOrdenDe));
      });

      it('201: reemplazar=true sin un libro previo simplemente lo crea', async () => {
        const res = await ingestar(
          cuentaMensualId,
          cuerpo(numero('REEMPLAZO-SIN-PREVIO'), { reemplazar: true }),
        ).expect(201);

        expect(res.body.transacciones).toHaveLength(2);
      });

      it('201: un N° distinto convive con el libro ya cargado', async () => {
        await ingestar(cuentaMensualId, cuerpo(numero('CUENTA-A'))).expect(201);
        await ingestar(cuentaMensualId, cuerpo(numero('CUENTA-B'))).expect(201);

        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('CUENTA-A')),
        ).toBe(1);
        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('CUENTA-B')),
        ).toBe(1);
      });

      it('el mismo N° en otra rendición mensual no choca', async () => {
        const otraCuenta = await resolverCuentaMensualId(
          app,
          await obtenerOrganismoBaseId(dataSource),
          MES_PRESENTAR,
        );
        await fijarEstadoCuenta(dataSource, otraCuenta);

        await ingestar(cuentaMensualId, cuerpo(numero('OTRA-CUENTA'))).expect(
          201,
        );
        await ingestar(otraCuenta, cuerpo(numero('OTRA-CUENTA'))).expect(201);
      });

      it('dos cargas simultáneas del mismo N°: una se guarda y la otra recibe 409', async () => {
        const respuestas = await Promise.all([
          ingestar(cuentaMensualId, cuerpo(numero('SIMULTANEO'))),
          ingestar(cuentaMensualId, cuerpo(numero('SIMULTANEO'))),
        ]);

        expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
          201, 409,
        ]);
        expect(respuestas.find((r) => r.status === 409)?.body.codigo).toBe(
          'LIBRO_DUPLICADO',
        );
        expect(
          await contarLibrosConNumero(cuentaMensualId, numero('SIMULTANEO')),
        ).toBe(1);
      });
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
        numeroCuentaCte: NUMERO_PRINCIPAL,
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

    describe('autorización', () => {
      it('401: sin token', async () => {
        await obtener(cuentaMensualId, null).expect(401);
      });

      it('403: un responsable de otro organismo no puede leer la rendición', async () => {
        await obtener(cuentaMensualId, bearerResponsableAjeno).expect(403);
      });

      it('403: el rol JUEZ_TRAMITE no puede leer libros', async () => {
        await obtener(cuentaMensualId, bearerJuez).expect(403);
      });

      it.each([
        ['ADMIN', () => bearerAdmin],
        ['AUDITOR', () => bearerAuditor],
      ])(
        '200: el rol %s lee la rendición de cualquier organismo',
        async (_rol, bearer) => {
          const res = await obtener(cuentaMensualId, bearer()).expect(200);
          expect(
            res.body.some((l: { id: number }) => l.id === libroIngestadoId),
          ).toBe(true);
        },
      );
    });
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

      await ingestar(cuentaBloqueadaId, cuerpo(numero('CANDADO'))).expect(201);

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

      const res = await ingestar(
        cuentaBloqueadaId,
        cuerpo(numero(`CANDADO-${estado}`)),
      ).expect(409);

      expect(res.body.message).toBe(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
      expect(await contarLibros()).toBe(antes);
    });

    it('409: con la cuenta bloqueada tampoco se puede reemplazar un libro', async () => {
      await fijarEstadoCuenta(dataSource, cuentaBloqueadaId);
      await ingestar(
        cuentaBloqueadaId,
        cuerpo(numero('CANDADO-REEMPLAZO')),
      ).expect(201);
      await fijarEstadoCuenta(
        dataSource,
        cuentaBloqueadaId,
        'LISTO_PARA_AUDITAR',
      );
      const antes = await contarLibros();

      await ingestar(
        cuentaBloqueadaId,
        cuerpo(numero('CANDADO-REEMPLAZO'), { reemplazar: true }),
      ).expect(409);

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
