import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_AUDITORIA,
  MES_AUDITORIA_BORRADOR,
  MES_AUDITORIA_CRUCE,
  MES_AUDITORIA_VACIA,
  crearAuditorConSesion,
  crearResponsableConSesion,
  crearSesionConRol,
  fijarEstadoCuenta,
  obtenerBearerAdmin,
  obtenerOrganismoBaseId,
  reiniciarAuditoria,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

interface Resultado {
  codigoRegla: string;
  estado: string;
  observaciones: unknown[];
  filasEvaluadas: number | null;
  librosFaltantes: string[];
}

//Corre contra la base de datos real y NO limpia lo que crea. Cada rendición reservada se deja lista para auditar
//al empezar (sin ejecuciones y presentada), así el spec se puede repetir.
describe('Auditoría (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let organismoId: number;

  let bearerAdmin: string;
  let auditor: { bearer: string; usuarioId: number };
  //rendición con solo el libro banco (una fila con el saldo equivocado)
  let cuentaMensualId: number;
  let transaccionIncorrectaId: number;
  //rendiciones reservadas: sin ningún libro, y para los rechazos por estado
  let cuentaVaciaId: number;
  let cuentaBorradorId: number;

  const api = () => request(app.getHttpServer());
  const auditar = (id: number | string) =>
    api().post(`/api/v1/auditoria/cuentas-mensuales/${id}/documentos/auditar`);
  const ejecucion = (id: number | string) =>
    api().get(`/api/v1/auditoria/cuentas-mensuales/${id}/ejecucion`);
  const listar = (id: number | string) =>
    api().get(`/api/v1/auditoria/cuentas-mensuales/${id}/observaciones`);
  const libros = (id: number) =>
    api()
      .get(`/api/v1/cuentas-mensuales/${id}/libro-banco`)
      .set('Authorization', bearerAdmin);
  const deRegla = (cuerpo: Resultado[], codigo: string) =>
    cuerpo.find((r) => r.codigoRegla === codigo);
  const estados = (cuerpo: Resultado[]) =>
    cuerpo.map((r) => [r.codigoRegla, r.estado]);
  const faltanLibros = (
    codigo: string,
    descripcion: string,
    faltantes: string[],
  ) => ({
    codigoRegla: codigo,
    descripcion,
    estado: 'FALTAN_LIBROS',
    mensaje: `Faltan libros requeridos: ${faltantes.join(', ')}`,
    observaciones: [],
    filasEvaluadas: null,
    librosFaltantes: faltantes,
  });
  const contar = async (sql: string, parametros: unknown[]) => {
    const [{ total }] = await dataSource.query(sql, parametros);
    return total as number;
  };
  const estadoEnBase = async (id: number): Promise<string> => {
    const [fila] = await dataSource.query(
      `SELECT estado FROM cuentas_mensuales WHERE id = $1`,
      [id],
    );
    return fila.estado;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    bearerAdmin = await obtenerBearerAdmin(app);
    organismoId = await obtenerOrganismoBaseId(dataSource);
    //el auditor asignado al organismo base (asignar otro reemplaza a este)
    auditor = await crearAuditorConSesion(app, organismoId);

    cuentaMensualId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_AUDITORIA,
    );
    cuentaVaciaId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_AUDITORIA_VACIA,
    );
    cuentaBorradorId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_AUDITORIA_BORRADOR,
    );

    //el libro solo se puede cargar en borrador: se carga si falta y después se deja la rendición lista para auditar
    await fijarEstadoCuenta(dataSource, cuentaMensualId);
    if ((await libros(cuentaMensualId).expect(200)).body.length === 0) {
      const responsable = await crearResponsableConSesion(app, organismoId);
      await api()
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

    await reiniciarAuditoria(dataSource, cuentaMensualId);
    await reiniciarAuditoria(dataSource, cuentaVaciaId);
    await reiniciarAuditoria(dataSource, cuentaBorradorId, 'EN_BORRADOR');
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('seguridad', () => {
    it('401: sin token en los tres endpoints', async () => {
      await auditar(cuentaMensualId).expect(401);
      await ejecucion(cuentaMensualId).expect(401);
      await listar(cuentaMensualId).expect(401);
    });

    it('403: un usuario con rol RESPONSABLE no puede auditar ni consultar', async () => {
      const bearer = await crearSesionConRol(app, 'RESPONSABLE');

      await auditar(cuentaMensualId).set('Authorization', bearer).expect(403);
      await ejecucion(cuentaMensualId).set('Authorization', bearer).expect(403);
      await listar(cuentaMensualId).set('Authorization', bearer).expect(403);
    });

    it('403: un AUDITOR sin el organismo asignado no puede auditar ni consultar', async () => {
      const { bearer } = await crearAuditorConSesion(app);

      await auditar(cuentaMensualId).set('Authorization', bearer).expect(403);
      await ejecucion(cuentaMensualId).set('Authorization', bearer).expect(403);
      await listar(cuentaMensualId).set('Authorization', bearer).expect(403);
      //y no pasó nada: la rendición sigue sin tomar
      expect(await estadoEnBase(cuentaMensualId)).toBe('LISTO_PARA_AUDITAR');
    });

    it('el 403 va antes que el 409: a un auditor ajeno no se le revela el estado de la rendición', async () => {
      const { bearer } = await crearAuditorConSesion(app);

      //la rendición en borrador daría 409 a quien sí puede auditarla
      await auditar(cuentaBorradorId).set('Authorization', bearer).expect(403);
    });
  });

  describe('validación de parámetros', () => {
    it('404: la cuenta mensual no existe', async () => {
      await auditar(ID_INEXISTENTE)
        .set('Authorization', bearerAdmin)
        .expect(404);
      await ejecucion(ID_INEXISTENTE)
        .set('Authorization', bearerAdmin)
        .expect(404);
      await listar(ID_INEXISTENTE)
        .set('Authorization', bearerAdmin)
        .expect(404);
    });

    it('400: el ID de la cuenta mensual no es válido', async () => {
      await auditar('abc').set('Authorization', bearerAdmin).expect(400);
      await ejecucion('0').set('Authorization', bearerAdmin).expect(400);
      await listar('0').set('Authorization', bearerAdmin).expect(400);
    });
  });

  describe('rechazos por estado', () => {
    afterAll(async () => {
      await fijarEstadoCuenta(dataSource, cuentaBorradorId);
    });

    it('409: una rendición en borrador todavía no se puede auditar', async () => {
      const res = await auditar(cuentaBorradorId)
        .set('Authorization', auditor.bearer)
        .expect(409);

      expect(res.body.message).toBe(
        'La rendición todavía no fue presentada: no se puede auditar.',
      );
      expect(await estadoEnBase(cuentaBorradorId)).toBe('EN_BORRADOR');
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1`,
          [cuentaBorradorId],
        ),
      ).toBe(0);
    });

    it('404 al pedir la ejecución y lista vacía al pedir las observaciones de una rendición nunca auditada', async () => {
      await ejecucion(cuentaBorradorId)
        .set('Authorization', auditor.bearer)
        .expect(404);
      const res = await listar(cuentaBorradorId)
        .set('Authorization', auditor.bearer)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it.each(['AUDITADA', 'CON_OBSERVACIONES'])(
      '409: una auditoría ya cerrada (%s) no se puede volver a ejecutar',
      async (estado) => {
        await fijarEstadoCuenta(dataSource, cuentaBorradorId, estado);

        const res = await auditar(cuentaBorradorId)
          .set('Authorization', auditor.bearer)
          .expect(409);

        expect(res.body.message).toBe(
          'La auditoría de esta rendición ya fue cerrada.',
        );
        expect(await estadoEnBase(cuentaBorradorId)).toBe(estado);
      },
    );
  });

  describe('POST .../documentos/auditar y GET .../ejecucion y .../observaciones', () => {
    it('200: el auditor toma la rendición: V3 queda en FALLO y las demás esperan el libro de ingresos y egresos', async () => {
      const res = await auditar(cuentaMensualId)
        .set('Authorization', auditor.bearer)
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
            ejecucionId: expect.any(Number),
            cuentaMensualId,
            codigoRegla: 'V3',
            tipo: 'INTERNA',
            descripcion:
              'El saldo calculado (1300.00) no coincide con el saldo informado (1400.00). Diferencia: 100.00.',
            libroOrigen: 'LIBRO_BANCO',
            estado: 'ABIERTA',
            transaccionId: transaccionIncorrectaId,
            transaccionIngresoEgresoId: null,
            valorInformado: 1400,
            valorCalculado: 1300,
            diferencia: 100,
            motivoDescarte: null,
            revisadaPorId: null,
            revisadaPor: null,
            revisadaEn: null,
          },
        ],
      });
      expect(deRegla(res.body, 'V1')).toEqual(
        faltanLibros('V1', 'Saldo de caja', ['INGRESOS_EGRESOS']),
      );
      expect(deRegla(res.body, 'C4')).toMatchObject({
        mensaje: 'Faltan libros requeridos: INGRESOS_EGRESOS',
        filasEvaluadas: null,
        librosFaltantes: ['INGRESOS_EGRESOS'],
      });
    });

    it('la rendición pasó a EN_AUDITORIA y la ejecución quedó guardada con quién y con qué reglas', async () => {
      expect(await estadoEnBase(cuentaMensualId)).toBe('EN_AUDITORIA');

      const [fila] = await dataSource.query(
        `SELECT * FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1`,
        [cuentaMensualId],
      );
      expect(fila).toMatchObject({
        ejecutada_por_id: auditor.usuarioId,
        version_reglas: '1',
        cerrada_en: null,
      });
      expect(fila.resultados).toHaveLength(6);
    });

    it('queda en la bitácora a nombre del auditor', async () => {
      const [evento] = await dataSource.query(
        `SELECT * FROM registro_actividad WHERE accion = 'AUDITORIA_EJECUTADA' AND usuario_id = $1 AND cuenta_mensual_id = $2 ORDER BY id LIMIT 1`,
        [auditor.usuarioId, cuentaMensualId],
      );
      expect(evento).toMatchObject({
        resultado: 'EXITO',
        codigo_http: 200,
        organismo_id: organismoId,
        entidad_tipo: 'CUENTA_MENSUAL',
        entidad_id: cuentaMensualId,
        roles: ['AUDITOR'],
        detalle: { ejecucionNueva: true, versionReglas: '1', observaciones: 1 },
      });
    });

    it('200: ejecutar de nuevo devuelve lo mismo, sin duplicar ni volver a tomar la rendición', async () => {
      const primera = await auditar(cuentaMensualId)
        .set('Authorization', auditor.bearer)
        .expect(200);
      const segunda = await auditar(cuentaMensualId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      expect(segunda.body).toEqual(primera.body);
      expect(deRegla(segunda.body, 'V3')!.observaciones).toHaveLength(1);
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1`,
          [cuentaMensualId],
        ),
      ).toBe(1);
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1 AND codigo_regla = 'V3'`,
          [cuentaMensualId],
        ),
      ).toBe(1);
      //el evento de la repetición dice que no fue una ejecución nueva
      const eventos = await dataSource.query(
        `SELECT detalle FROM registro_actividad WHERE accion = 'AUDITORIA_EJECUTADA' AND cuenta_mensual_id = $1 ORDER BY id DESC LIMIT 1`,
        [cuentaMensualId],
      );
      expect(eventos[0].detalle.ejecucionNueva).toBe(false);
    });

    it('200: dos ejecuciones simultáneas dan una sola ejecución', async () => {
      await reiniciarAuditoria(dataSource, cuentaMensualId);

      const respuestas = await Promise.all([
        auditar(cuentaMensualId).set('Authorization', auditor.bearer),
        auditar(cuentaMensualId).set('Authorization', auditor.bearer),
      ]);

      expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
      expect(respuestas[1].body).toEqual(respuestas[0].body);
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1`,
          [cuentaMensualId],
        ),
      ).toBe(1);
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1`,
          [cuentaMensualId],
        ),
      ).toBe(1);
    });

    it('GET ejecucion: resultados, cobertura y contadores por estado', async () => {
      const res = await ejecucion(cuentaMensualId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      expect(res.body).toMatchObject({
        id: expect.any(Number),
        cuentaMensualId,
        versionReglas: '1',
        ejecutadaPorId: auditor.usuarioId,
        ejecutadaPor: {
          id: auditor.usuarioId,
          nombre: 'Fixture',
          apellido: 'E2E',
        },
        ejecutadaEn: expect.any(String),
        cerradaEn: null,
        cerradaPorId: null,
        cerradaPor: null,
        conclusion: null,
        estadoFinal: null,
        observaciones: { abiertas: 1, confirmadas: 0, descartadas: 0 },
      });
      expect(estados(res.body.resultados)).toEqual([
        ['V1', 'FALTAN_LIBROS'],
        ['V2', 'FALTAN_LIBROS'],
        ['V3', 'FALLO'],
        ['C4', 'FALTAN_LIBROS'],
        ['C5', 'FALTAN_LIBROS'],
        ['C6', 'FALTAN_LIBROS'],
      ]);
      expect(deRegla(res.body.resultados, 'V3')!.observaciones).toHaveLength(1);
    });

    it('GET observaciones: las de la última ejecución, a las que puede acceder el auditor y el admin', async () => {
      for (const bearer of [auditor.bearer, bearerAdmin]) {
        const res = await listar(cuentaMensualId)
          .set('Authorization', bearer)
          .expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].transaccionId).toBe(transaccionIncorrectaId);
      }
    });

    it('si cambia la versión de reglas se guarda una ejecución nueva y la anterior queda de historial', async () => {
      //se simula que la ejecución existente corrió con unas reglas anteriores
      await dataSource.query(
        `UPDATE ejecuciones_auditoria SET version_reglas = '0' WHERE cuenta_mensual_id = $1`,
        [cuentaMensualId],
      );

      const res = await auditar(cuentaMensualId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      const versiones = await dataSource.query(
        `SELECT version_reglas FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1 ORDER BY id`,
        [cuentaMensualId],
      );
      expect(
        versiones.map((v: { version_reglas: string }) => v.version_reglas),
      ).toEqual(['0', '1']);
      //la rendición ya estaba tomada, sigue en EN_AUDITORIA
      expect(await estadoEnBase(cuentaMensualId)).toBe('EN_AUDITORIA');
      //las observaciones y el detalle son los de la ejecución más reciente
      expect(deRegla(res.body, 'V3')!.observaciones).toHaveLength(1);
      expect(
        (await ejecucion(cuentaMensualId).set('Authorization', auditor.bearer))
          .body.versionReglas,
      ).toBe('1');
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1`,
          [cuentaMensualId],
        ),
      ).toBe(2);
      const ultima = await listar(cuentaMensualId)
        .set('Authorization', auditor.bearer)
        .expect(200);
      expect(ultima.body).toHaveLength(1);
    });

    it('200: una rendición presentada sin ningún libro da FALTAN_LIBROS en todas las reglas', async () => {
      const res = await auditar(cuentaVaciaId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      expect(res.body).toEqual([
        faltanLibros('V1', 'Saldo de caja', ['INGRESOS_EGRESOS']),
        faltanLibros('V2', 'Saldo de banco (ingresos y egresos)', [
          'INGRESOS_EGRESOS',
        ]),
        faltanLibros('V3', 'Saldo de cuenta', ['LIBRO_BANCO']),
        faltanLibros('C4', 'Depósitos bancarios', [
          'LIBRO_BANCO',
          'INGRESOS_EGRESOS',
        ]),
        faltanLibros('C5', 'Retiros bancarios', [
          'LIBRO_BANCO',
          'INGRESOS_EGRESOS',
        ]),
        faltanLibros('C6', 'Saldo final bancario', [
          'LIBRO_BANCO',
          'INGRESOS_EGRESOS',
        ]),
      ]);
      const observaciones = await listar(cuentaVaciaId)
        .set('Authorization', auditor.bearer)
        .expect(200);
      expect(observaciones.body).toEqual([]);
      expect(await estadoEnBase(cuentaVaciaId)).toBe('EN_AUDITORIA');
    });
  });

  //banco consistente (depósitos 1500, retiros 200, saldo final 1300) contra un libro de ingresos y egresos con
  //fallos sembrados: V1 en las filas 3 y 4 (dos hallazgos del mismo código en la rendición), V2 en la fila 2,
  //retiros 250 (C5) y saldo final 1150 (C6)
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
      cuentaCruceId = await resolverCuentaMensualId(
        app,
        organismoId,
        MES_AUDITORIA_CRUCE,
      );
      await reiniciarAuditoria(dataSource, cuentaCruceId, 'EN_BORRADOR');
      const { bearer } = await crearResponsableConSesion(app, organismoId);

      //reemplazar=true: los dos libros se dejan siempre iguales, sin importar lo que hubiera
      await api()
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
      const ingestado = await api()
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
            filaIE(4, { cajaDebe: 10, cajaSaldo: 999, bancoSaldo: 1150 }),
          ],
        })
        .expect(201);
      idsFilasIE = ingestado.body.transacciones.map(
        (t: { id: number }) => t.id,
      );

      //la presenta el responsable por la API: con los dos documentos cargados queda lista para auditar
      await api()
        .patch(`/api/v1/cuentas-mensuales/${cuentaCruceId}/presentar`)
        .set('Authorization', bearer)
        .expect(200);
    });

    it('200: cada regla da su resultado, con las filas y los totales que no coinciden', async () => {
      const res = await auditar(cuentaCruceId)
        .set('Authorization', auditor.bearer)
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
        importes: [number, number, number],
      ) => ({
        id: expect.any(Number),
        ejecucionId: expect.any(Number),
        cuentaMensualId: cuentaCruceId,
        codigoRegla: codigo,
        tipo,
        descripcion,
        libroOrigen: 'INGRESOS_EGRESOS',
        estado: 'ABIERTA',
        transaccionId: null,
        transaccionIngresoEgresoId,
        valorInformado: importes[0],
        valorCalculado: importes[1],
        diferencia: importes[2],
        motivoDescarte: null,
        revisadaPorId: null,
        revisadaPor: null,
        revisadaEn: null,
      });
      expect(deRegla(res.body, 'V1')!).toMatchObject({
        descripcion: 'Saldo de caja',
        observaciones: [
          observacion(
            'V1',
            'INTERNA',
            'Error de fórmula en la fila 3: el saldo de caja calculado (130.00) no coincide con el saldo informado (140.00). Diferencia: 10.00.',
            idsFilasIE[2],
            [140, 130, 10],
          ),
          observacion(
            'V1',
            'INTERNA',
            'Error de fórmula en la fila 4: el saldo de caja calculado (150.00) no coincide con el saldo informado (999.00). Diferencia: 849.00.',
            idsFilasIE[3],
            [999, 150, 849],
          ),
        ],
      });
      expect(deRegla(res.body, 'V2')!.observaciones).toEqual([
        observacion(
          'V2',
          'INTERNA',
          'Error de fórmula en la fila 2: el saldo de banco calculado (1500.00) no coincide con el saldo informado (1400.00). Diferencia: 100.00.',
          idsFilasIE[1],
          [1400, 1500, 100],
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
          [250, 200, 50],
        ),
      ]);
      expect(deRegla(res.body, 'C6')!.observaciones).toEqual([
        observacion(
          'C6',
          'CRUZAMIENTO',
          'Saldo bancario inconsistente: el saldo final de banco del libro de Ingresos y Egresos (1150.00) no coincide con el saldo final del Libro Banco (1300.00). Diferencia: 150.00.',
          null,
          [1150, 1300, 150],
        ),
      ]);
    });

    it('200: ejecutar de nuevo no duplica ninguna observación y se conservan los dos hallazgos V1', async () => {
      const primera = await auditar(cuentaCruceId)
        .set('Authorization', auditor.bearer)
        .expect(200);
      const segunda = await auditar(cuentaCruceId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      expect(segunda.body).toEqual(primera.body);
      expect(
        await contar(
          `SELECT count(*)::int AS total FROM observaciones WHERE cuenta_mensual_id = $1`,
          [cuentaCruceId],
        ),
      ).toBe(5);
    });

    it('GET ejecucion: la cobertura y los contadores de la rendición cruzada', async () => {
      const res = await ejecucion(cuentaCruceId)
        .set('Authorization', auditor.bearer)
        .expect(200);

      expect(res.body.observaciones).toEqual({
        abiertas: 5,
        confirmadas: 0,
        descartadas: 0,
      });
      expect(
        res.body.resultados.map((r: Resultado) => [r.codigoRegla, r.estado]),
      ).toEqual([
        ['V1', 'FALLO'],
        ['V2', 'FALLO'],
        ['V3', 'VERIFICADO'],
        ['C4', 'VERIFICADO'],
        ['C5', 'FALLO'],
        ['C6', 'FALLO'],
      ]);
    });

    it('GET observaciones lista las cinco, todas del libro de ingresos y egresos', async () => {
      const res = await listar(cuentaCruceId)
        .set('Authorization', auditor.bearer)
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
          .set('Authorization', auditor.bearer)
          .expect(200)
      ).body;
      const libro = (
        await api()
          .get(`/api/v1/cuentas-mensuales/${cuentaCruceId}/ingresos-egresos`)
          .set('Authorization', auditor.bearer)
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
  });
});
