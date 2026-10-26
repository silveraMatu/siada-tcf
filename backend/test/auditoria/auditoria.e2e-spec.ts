import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_AUDITORIA,
  MES_AUDITORIA_CRUCE,
  MES_SIN_LIBRO,
  crearResponsableConSesion,
  fijarEstadoCuenta,
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

  //el resultado de una regla dentro de la respuesta de ejecutar
  interface Resultado {
    codigoRegla: string;
    estado: string;
    observaciones: unknown[];
    filasEvaluadas: number | null;
    librosFaltantes: string[];
  }
  const deRegla = (cuerpo: Resultado[], codigo: string) =>
    cuerpo.find((r) => r.codigoRegla === codigo);
  const estados = (cuerpo: Resultado[]) =>
    cuerpo.map((r) => [r.codigoRegla, r.estado]);

  const faltanLibros = (
    codigo: string,
    descripcion: string,
    libros: string,
  ) => ({
    codigoRegla: codigo,
    descripcion,
    estado: 'FALTAN_LIBROS',
    mensaje: `Faltan libros requeridos: ${libros}`,
    observaciones: [],
    filasEvaluadas: null,
    librosFaltantes: libros.split(', '),
  });

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
    it('200: V3 queda en FALLO con la única fila de saldo incorrecto y las reglas de ingresos y egresos esperan su libro', async () => {
      const res = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(estados(res.body)).toEqual([
        ['V1', 'FALTAN_LIBROS'],
        ['V2', 'FALTAN_LIBROS'],
        ['V3', 'FALLO'],
        ['C4', 'FALTAN_LIBROS'],
        ['C5', 'FALTAN_LIBROS'],
        ['C6', 'FALTAN_LIBROS'],
      ]);
      expect(deRegla(res.body, 'V3')).toEqual({
        codigoRegla: 'V3',
        descripcion: 'Saldo de cuenta',
        estado: 'FALLO',
        //3 filas: la primera es la base y se validan las otras 2
        filasEvaluadas: 2,
        librosFaltantes: [],
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
            transaccionIngresoEgresoId: null,
          },
        ],
      });
      expect(deRegla(res.body, 'V1')).toEqual({
        codigoRegla: 'V1',
        descripcion: 'Saldo de caja',
        estado: 'FALTAN_LIBROS',
        mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
        observaciones: [],
        filasEvaluadas: null,
        librosFaltantes: ['INGRESOS_EGRESOS'],
      });
      //el cruce tiene el banco pero no el libro de ingresos y egresos: solo informa el que falta
      expect(deRegla(res.body, 'C4')).toMatchObject({
        mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
        filasEvaluadas: null,
        librosFaltantes: ['INGRESOS_EGRESOS'],
      });
    });

    it('200: ejecutar de nuevo no duplica la observación', async () => {
      const primera = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);
      const segunda = await ejecutar(cuentaMensualId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(segunda.body).toEqual(primera.body);
      expect(deRegla(segunda.body, 'V3')!.observaciones).toHaveLength(1);

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
        faltanLibros('V1', 'Saldo de caja', 'INGRESOS_EGRESOS'),
        faltanLibros(
          'V2',
          'Saldo de banco (ingresos y egresos)',
          'INGRESOS_EGRESOS',
        ),
        faltanLibros('V3', 'Saldo de cuenta', 'LIBRO_BANCO'),
        faltanLibros(
          'C4',
          'Depósitos bancarios',
          'LIBRO_BANCO, INGRESOS_EGRESOS',
        ),
        faltanLibros(
          'C5',
          'Retiros bancarios',
          'LIBRO_BANCO, INGRESOS_EGRESOS',
        ),
        faltanLibros(
          'C6',
          'Saldo final bancario',
          'LIBRO_BANCO, INGRESOS_EGRESOS',
        ),
      ]);
      expect(listado.body).toEqual([]);
    });
  });

  //banco consistente (depósitos 1500, retiros 200, saldo final 1300) contra un libro de ingresos y egresos
  //con fallos sembrados: V1 en las filas 3 y 4 (dos hallazgos del mismo código en la cuenta), V2 en la
  //fila 2, retiros 250 (C5) y saldo final 1150 (C6)
  describe('cruce con el libro de Ingresos y Egresos', () => {
    let cuentaCruceId: number;
    //id de las filas del libro de ingresos y egresos, en orden de fila
    let idsFilasIE: number[];

    const filaIE = (fila: number, extra: Record<string, unknown>) => ({
      fila,
      fecha: '2026-03-01',
      concepto: `Fila ${fila}`,
      cajaDebe: 0,
      cajaHaber: 0,
      cajaSaldo: 0,
      bancoDebe: 0,
      bancoHaber: 0,
      bancoSaldo: 0,
      egresoInc1: 0,
      egresoInc2: 0,
      egresoInc3: 0,
      egresoInc4: 0,
      egresoInc5: 0,
      ingresoMunicipal: 0,
      ingresoOtras: 0,
      cuentasVariasDebe: 0,
      cuentasVariasHaber: 0,
      ...extra,
    });

    beforeAll(async () => {
      const organismoId = await obtenerOrganismoBaseId(dataSource);
      cuentaCruceId = await resolverCuentaMensualId(
        app,
        organismoId,
        MES_AUDITORIA_CRUCE,
      );
      await fijarEstadoCuenta(dataSource, cuentaCruceId);
      const { bearer } = await crearResponsableConSesion(app, organismoId);

      //reemplazar=true: los dos libros se dejan siempre iguales, sin importar lo que hubiera
      await request(app.getHttpServer())
        .post(`/api/v1/cuentas-mensuales/${cuentaCruceId}/libro-banco/ingestar`)
        .set('Authorization', bearer)
        .send({
          numeroCuentaCte: '999-CRUCE/E2E',
          reemplazar: true,
          transacciones: [
            { aLaOrdenDe: 'Base', depositos: 1000, retiro: 0, saldo: 1000 },
            { aLaOrdenDe: 'Cobro', depositos: 500, retiro: 0, saldo: 1500 },
            { aLaOrdenDe: 'Pago', depositos: 0, retiro: 200, saldo: 1300 },
          ],
        })
        .expect(201);
      const ingestado = await request(app.getHttpServer())
        .post(
          `/api/v1/cuentas-mensuales/${cuentaCruceId}/ingresos-egresos/ingestar`,
        )
        .set('Authorization', bearer)
        .send({
          numeroCuentaCte: '999-CRUCE/E2E',
          reemplazar: true,
          transacciones: [
            filaIE(1, {
              cajaDebe: 100,
              cajaSaldo: 100,
              bancoDebe: 1000,
              bancoSaldo: 1000,
            }),
            //V2: debería ser 1500
            filaIE(2, {
              cajaDebe: 50,
              cajaSaldo: 150,
              bancoDebe: 500,
              bancoSaldo: 1400,
            }),
            //V1: la caja debería ser 130; banco 1400 - 250 = 1150 es coherente
            filaIE(3, {
              cajaHaber: 20,
              cajaSaldo: 140,
              bancoHaber: 250,
              bancoSaldo: 1150,
            }),
            //V1: la caja debería ser 150; el banco no se mueve
            filaIE(4, {
              cajaDebe: 10,
              cajaSaldo: 999,
              bancoSaldo: 1150,
            }),
          ],
        })
        .expect(201);
      idsFilasIE = ingestado.body.transacciones.map(
        (t: { id: number }) => t.id,
      );
    });

    it('200: cada regla da su resultado, con las filas y los totales que no coinciden', async () => {
      const res = await ejecutar(cuentaCruceId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(estados(res.body)).toEqual([
        ['V1', 'FALLO'],
        ['V2', 'FALLO'],
        ['V3', 'VERIFICADO'],
        ['C4', 'VERIFICADO'],
        ['C5', 'FALLO'],
        ['C6', 'FALLO'],
      ]);

      //cobertura: V1 y V2 validan 3 de las 4 filas, V3 2 de las 3 y los cruces hacen una comparación
      expect(
        res.body.map((r: Resultado) => [
          r.codigoRegla,
          r.filasEvaluadas,
          r.librosFaltantes,
        ]),
      ).toEqual([
        ['V1', 3, []],
        ['V2', 3, []],
        ['V3', 2, []],
        ['C4', 1, []],
        ['C5', 1, []],
        ['C6', 1, []],
      ]);

      const observacion = (
        codigo: string,
        tipo: string,
        descripcion: string,
        transaccionIngresoEgresoId: number | null,
      ) => ({
        id: expect.any(Number),
        cuentaMensualId: cuentaCruceId,
        codigoRegla: codigo,
        tipo,
        descripcion,
        libroOrigen: 'INGRESOS_EGRESOS',
        estado: 'ABIERTA',
        transaccionId: null,
        transaccionIngresoEgresoId,
      });
      expect(deRegla(res.body, 'V1')!).toMatchObject({
        descripcion: 'Saldo de caja',
        observaciones: [
          observacion(
            'V1',
            'INTERNA',
            'Error de fórmula en la fila 3: el saldo de caja calculado (130.00) no coincide con el saldo informado (140.00). Diferencia: 10.00.',
            idsFilasIE[2],
          ),
          observacion(
            'V1',
            'INTERNA',
            'Error de fórmula en la fila 4: el saldo de caja calculado (150.00) no coincide con el saldo informado (999.00). Diferencia: 849.00.',
            idsFilasIE[3],
          ),
        ],
      });
      expect(deRegla(res.body, 'V2')!.observaciones).toEqual([
        observacion(
          'V2',
          'INTERNA',
          'Error de fórmula en la fila 2: el saldo de banco calculado (1500.00) no coincide con el saldo informado (1400.00). Diferencia: 100.00.',
          idsFilasIE[1],
        ),
      ]);
      expect(deRegla(res.body, 'V3')).toEqual({
        codigoRegla: 'V3',
        descripcion: 'Saldo de cuenta',
        estado: 'VERIFICADO',
        observaciones: [],
        filasEvaluadas: 2,
        librosFaltantes: [],
      });
      expect(deRegla(res.body, 'C4')!.observaciones).toEqual([]);
      expect(deRegla(res.body, 'C5')!.observaciones).toEqual([
        observacion(
          'C5',
          'CRUZAMIENTO',
          'Inconsistencia en retiros bancarios: el total de banco haber del libro de Ingresos y Egresos (250.00) no coincide con el total de retiros del Libro Banco (200.00). Diferencia: 50.00.',
          null,
        ),
      ]);
      expect(deRegla(res.body, 'C6')!.observaciones).toEqual([
        observacion(
          'C6',
          'CRUZAMIENTO',
          'Saldo bancario inconsistente: el saldo final de banco del libro de Ingresos y Egresos (1150.00) no coincide con el saldo final del Libro Banco (1300.00). Diferencia: 150.00.',
          null,
        ),
      ]);
    });

    it('200: ejecutar de nuevo no duplica ninguna observación y se conservan los dos hallazgos V1', async () => {
      const primera = await ejecutar(cuentaCruceId)
        .set('Authorization', bearerAdmin)
        .expect(200);
      const segunda = await ejecutar(cuentaCruceId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(segunda.body).toEqual(primera.body);
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1`,
        [cuentaCruceId],
      );
      expect(total).toBe(5);
    });

    it('200: GET observaciones lista las cinco, todas del libro de ingresos y egresos', async () => {
      const res = await listar(cuentaCruceId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      expect(
        res.body.map((o: { codigoRegla: string }) => o.codigoRegla).sort(),
      ).toEqual(['C5', 'C6', 'V1', 'V1', 'V2']);
      expect(
        res.body.every(
          (o: { libroOrigen: string }) => o.libroOrigen === 'INGRESOS_EGRESOS',
        ),
      ).toBe(true);
    });

    it('GET observaciones: cada hallazgo de fila se ubica en su libro y los de cuenta no traen fila', async () => {
      interface Obs {
        codigoRegla: string;
        descripcion: string;
        transaccionId: number | null;
        transaccionIngresoEgresoId: number | null;
      }
      const observaciones: Obs[] = (
        await listar(cuentaCruceId)
          .set('Authorization', bearerAdmin)
          .expect(200)
      ).body;
      const libro = (
        await request(app.getHttpServer())
          .get(`/api/v1/cuentas-mensuales/${cuentaCruceId}/ingresos-egresos`)
          .set('Authorization', bearerAdmin)
          .expect(200)
      ).body;

      for (const o of observaciones.filter((x) =>
        /^V[12]$/.test(x.codigoRegla),
      )) {
        //el id alcanza para ubicar la fila: la transacción trae su número de fila, que el texto también menciona
        const transaccion = libro.transacciones.find(
          (t: { id: number }) => t.id === o.transaccionIngresoEgresoId,
        );
        expect(transaccion).toBeDefined();
        expect(o.descripcion).toContain(`en la fila ${transaccion.fila}:`);
        expect(o.transaccionId).toBeNull();
      }
      for (const o of observaciones.filter((x) =>
        /^C[56]$/.test(x.codigoRegla),
      )) {
        expect(o.transaccionId).toBeNull();
        expect(o.transaccionIngresoEgresoId).toBeNull();
      }
    });

    it('las observaciones de una fila caen con el libro cuando se reemplaza, y las de cuenta no', async () => {
      const organismoId = await obtenerOrganismoBaseId(dataSource);
      const { bearer } = await crearResponsableConSesion(app, organismoId);
      await request(app.getHttpServer())
        .post(
          `/api/v1/cuentas-mensuales/${cuentaCruceId}/ingresos-egresos/ingestar`,
        )
        .set('Authorization', bearer)
        .send({
          reemplazar: true,
          transacciones: [filaIE(1, {})],
        })
        .expect(201);

      const res = await listar(cuentaCruceId)
        .set('Authorization', bearerAdmin)
        .expect(200);

      //V1 y V2 estaban ligadas a filas del libro viejo; C5 y C6 son de toda la cuenta
      expect(
        res.body.map((o: { codigoRegla: string }) => o.codigoRegla).sort(),
      ).toEqual(['C5', 'C6']);
    });
  });
});
