import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  ID_INEXISTENTE,
  MES_AUDITORIA_CICLO,
  crearAuditorConSesion,
  crearResponsableConSesion,
  crearSesionConRol,
  obtenerBearerAdmin,
  obtenerOrganismoBaseId,
  reiniciarAuditoria,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

interface Observacion {
  id: number;
  codigoRegla: string;
  estado: string;
  motivoDescarte: string | null;
  revisadaPorId: number | null;
  revisadaEn: string | null;
}

//Corre contra la base de datos real y NO limpia lo que crea. Banco consistente (depósitos 1500, retiros 200,
//saldo final 1300) y un libro de ingresos y egresos con exactamente dos hallazgos: V2 en la fila 2 (el saldo de
//banco debería ser 1500) y C6 (el saldo final de banco es 1200 y el del banco, 1300). Cada prueba parte de una
//auditoría recién ejecutada, sin revisar.
describe('Revisión de observaciones y cierre de la auditoría (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let organismoId: number;
  let cuentaId: number;
  let auditor: { bearer: string; usuarioId: number };

  const api = () => request(app.getHttpServer());
  const revisar = (
    id: number | string,
    cuerpo: unknown,
    bearer: string | null = auditor.bearer,
  ) => {
    const peticion = api().patch(`/api/v1/auditoria/observaciones/${id}`);
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      cuerpo as object,
    );
  };
  const cerrar = (
    cuerpo: unknown,
    id: number | string = cuentaId,
    bearer: string | null = auditor.bearer,
  ) => {
    const peticion = api().post(
      `/api/v1/auditoria/cuentas-mensuales/${id}/cerrar`,
    );
    return (bearer ? peticion.set('Authorization', bearer) : peticion).send(
      cuerpo as object,
    );
  };
  const auditar = () =>
    api()
      .post(
        `/api/v1/auditoria/cuentas-mensuales/${cuentaId}/documentos/auditar`,
      )
      .set('Authorization', auditor.bearer);
  const ejecucion = () =>
    api()
      .get(`/api/v1/auditoria/cuentas-mensuales/${cuentaId}/ejecucion`)
      .set('Authorization', auditor.bearer);
  const estadoEnBase = async (): Promise<string> => {
    const [fila] = await dataSource.query(
      `SELECT estado FROM cuentas_mensuales WHERE id = $1`,
      [cuentaId],
    );
    return fila.estado;
  };

  //deja la rendición presentada, sin ejecuciones, la audita y devuelve sus dos observaciones (V2 y C6)
  const prepararAuditoria = async (): Promise<{
    v2: Observacion;
    c6: Observacion;
  }> => {
    await reiniciarAuditoria(dataSource, cuentaId);
    await auditar().expect(200);
    const observaciones: Observacion[] = (
      await api()
        .get(`/api/v1/auditoria/cuentas-mensuales/${cuentaId}/observaciones`)
        .set('Authorization', auditor.bearer)
        .expect(200)
    ).body;
    expect(observaciones).toHaveLength(2);
    return {
      v2: observaciones.find((o) => o.codigoRegla === 'V2')!,
      c6: observaciones.find((o) => o.codigoRegla === 'C6')!,
    };
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoBaseId(dataSource);
    cuentaId = await resolverCuentaMensualId(
      app,
      organismoId,
      MES_AUDITORIA_CICLO,
    );
    auditor = await crearAuditorConSesion(app, organismoId);

    await reiniciarAuditoria(dataSource, cuentaId, 'EN_BORRADOR');
    const { bearer } = await crearResponsableConSesion(app, organismoId);
    const fila = (n: number, extra: Record<string, unknown>) => ({
      fila: n,
      fecha: '2026-03-01',
      concepto: `Fila ${n}`,
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
    await api()
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/libro-banco/ingestar`)
      .set('Authorization', bearer)
      .send({
        numeroCuentaCte: '999-CIERRE/E2E',
        reemplazar: true,
        transacciones: [
          { aLaOrdenDe: 'Base', depositos: 1000, retiro: 0, saldo: 1000 },
          { aLaOrdenDe: 'Cobro', depositos: 500, retiro: 0, saldo: 1500 },
          { aLaOrdenDe: 'Pago', depositos: 0, retiro: 200, saldo: 1300 },
        ],
      })
      .expect(201);
    await api()
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/ingresos-egresos/ingestar`)
      .set('Authorization', bearer)
      .send({
        reemplazar: true,
        transacciones: [
          fila(1, { bancoDebe: 1000, bancoSaldo: 1000 }),
          //V2: debería ser 1500
          fila(2, { bancoDebe: 500, bancoSaldo: 1400 }),
          //desde el saldo informado 1400: 1400 - 200 = 1200 es coherente; C6: 1200 contra 1300 del banco
          fila(3, { bancoHaber: 200, bancoSaldo: 1200 }),
        ],
      })
      .expect(201);
    await api()
      .patch(`/api/v1/cuentas-mensuales/${cuentaId}/presentar`)
      .set('Authorization', bearer)
      .expect(200);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  describe('seguridad y validación', () => {
    it('401 sin token y 403 para quien no puede auditar', async () => {
      const { v2 } = await prepararAuditoria();

      await revisar(v2.id, { decision: 'CONFIRMAR' }, null).expect(401);
      await cerrar({ conclusion: 'x' }, cuentaId, null).expect(401);
      for (const bearer of [
        await crearSesionConRol(app, 'RESPONSABLE'),
        await crearSesionConRol(app, 'JUEZ_TRAMITE'),
        await crearSesionConRol(app, 'SUPERVISOR'),
        //un auditor al que no le asignaron el organismo
        (await crearAuditorConSesion(app)).bearer,
      ]) {
        await revisar(v2.id, { decision: 'CONFIRMAR' }, bearer).expect(403);
        await cerrar({ conclusion: 'x' }, cuentaId, bearer).expect(403);
      }
      //y no cambió nada
      expect(await estadoEnBase()).toBe('EN_AUDITORIA');
      const [fila] = await dataSource.query(
        `SELECT estado FROM observaciones WHERE id = $1`,
        [v2.id],
      );
      expect(fila.estado).toBe('ABIERTA');
    });

    it('404: la observación o la cuenta no existen', async () => {
      await revisar(ID_INEXISTENTE, { decision: 'CONFIRMAR' }).expect(404);
      await cerrar({ conclusion: 'x' }, ID_INEXISTENTE).expect(404);
    });

    it('400: ids inválidos, decisión desconocida y descartar sin motivo', async () => {
      const { v2 } = await prepararAuditoria();

      await revisar('abc', { decision: 'CONFIRMAR' }).expect(400);
      await revisar('0', { decision: 'CONFIRMAR' }).expect(400);
      await cerrar({ conclusion: 'x' }, 'abc').expect(400);
      await revisar(v2.id, { decision: 'APROBAR' }).expect(400);
      await revisar(v2.id, {}).expect(400);
      await revisar(v2.id, { decision: 'DESCARTAR' }).expect(400);
      await revisar(v2.id, { decision: 'DESCARTAR', motivo: '   ' }).expect(
        400,
      );
      await cerrar({}).expect(400);
      await cerrar({ conclusion: '   ' }).expect(400);
      const [fila] = await dataSource.query(
        `SELECT estado FROM observaciones WHERE id = $1`,
        [v2.id],
      );
      expect(fila.estado).toBe('ABIERTA');
    });
  });

  describe('PATCH /auditoria/observaciones/:id', () => {
    it('CONFIRMAR deja la observación CONFIRMADA con quién y cuándo, y el contador la refleja', async () => {
      const { v2 } = await prepararAuditoria();

      const res = await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);

      expect(res.body).toMatchObject({
        id: v2.id,
        codigoRegla: 'V2',
        estado: 'CONFIRMADA',
        motivoDescarte: null,
        revisadaPorId: auditor.usuarioId,
        revisadaPor: {
          id: auditor.usuarioId,
          nombre: 'Fixture',
          apellido: 'E2E',
        },
        revisadaEn: expect.any(String),
        valorInformado: 1400,
        valorCalculado: 1500,
        diferencia: 100,
      });
      const cuerpo = (await ejecucion().expect(200)).body;
      expect(cuerpo.observaciones).toEqual({
        abiertas: 1,
        confirmadas: 1,
        descartadas: 0,
      });
    });

    it('DESCARTAR exige y guarda el motivo; REABRIR lo borra y la deja ABIERTA', async () => {
      const { c6 } = await prepararAuditoria();

      const descartada = await revisar(c6.id, {
        decision: 'DESCARTAR',
        motivo: '  Es un asiento de ajuste del cierre  ',
      }).expect(200);
      expect(descartada.body).toMatchObject({
        estado: 'DESCARTADA',
        motivoDescarte: 'Es un asiento de ajuste del cierre',
        revisadaPorId: auditor.usuarioId,
      });

      const reabierta = await revisar(c6.id, { decision: 'REABRIR' }).expect(
        200,
      );
      expect(reabierta.body).toMatchObject({
        estado: 'ABIERTA',
        motivoDescarte: null,
        revisadaPorId: null,
        revisadaPor: null,
        revisadaEn: null,
      });
    });

    it('se puede cambiar de opinión mientras la auditoría está en curso', async () => {
      const { v2 } = await prepararAuditoria();

      await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);
      const res = await revisar(v2.id, {
        decision: 'DESCARTAR',
        motivo: 'Me equivoqué',
      }).expect(200);

      expect(res.body.estado).toBe('DESCARTADA');
    });

    it('queda en la bitácora con la decisión, el motivo y los datos de la rendición', async () => {
      const { v2 } = await prepararAuditoria();
      await revisar(v2.id, {
        decision: 'DESCARTAR',
        motivo: 'No corresponde',
      }).expect(200);

      const [evento] = await dataSource.query(
        `SELECT * FROM registro_actividad WHERE accion = 'OBSERVACION_REVISADA' AND entidad_id = $1 ORDER BY id DESC LIMIT 1`,
        [v2.id],
      );

      expect(evento).toMatchObject({
        resultado: 'EXITO',
        usuario_id: auditor.usuarioId,
        entidad_tipo: 'OBSERVACION',
        cuenta_mensual_id: cuentaId,
        organismo_id: organismoId,
        detalle: {
          decision: 'DESCARTAR',
          estadoAnterior: 'ABIERTA',
          estadoNuevo: 'DESCARTADA',
          codigoRegla: 'V2',
          motivo: 'No corresponde',
        },
      });
    });

    it('409: una observación de una ejecución anterior ya no se revisa', async () => {
      const { v2: vieja } = await prepararAuditoria();
      //se simula que esa ejecución corrió con unas reglas anteriores: al auditar se guarda una nueva
      await dataSource.query(
        `UPDATE ejecuciones_auditoria SET version_reglas = '0' WHERE cuenta_mensual_id = $1`,
        [cuentaId],
      );
      await auditar().expect(200);

      const res = await revisar(vieja.id, { decision: 'CONFIRMAR' }).expect(
        409,
      );

      expect(res.body.message).toBe(
        'La observación pertenece a una ejecución anterior: revisá la más reciente.',
      );
    });
  });

  describe('POST /auditoria/cuentas-mensuales/:id/cerrar', () => {
    it('409: no se puede cerrar con observaciones sin revisar', async () => {
      const { v2 } = await prepararAuditoria();

      const todas = await cerrar({ conclusion: 'Conclusión' }).expect(409);
      expect(todas.body.message).toBe(
        'Quedan 2 observaciones sin revisar: confirmalas o descartalas antes de cerrar.',
      );

      await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);
      const una = await cerrar({ conclusion: 'Conclusión' }).expect(409);
      expect(una.body.message).toBe(
        'Queda 1 observación sin revisar: confirmala o descartala antes de cerrar.',
      );
      expect(await estadoEnBase()).toBe('EN_AUDITORIA');
    });

    it('con una observación confirmada la rendición queda CON_OBSERVACIONES y la ejecución guarda el cierre', async () => {
      const { v2, c6 } = await prepararAuditoria();
      await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);
      await revisar(c6.id, {
        decision: 'DESCARTAR',
        motivo: 'Ajuste de cierre',
      }).expect(200);

      const res = await cerrar({
        conclusion: '  Se observa un error de fórmula  ',
      }).expect(200);

      expect(res.body).toMatchObject({
        cuentaMensualId: cuentaId,
        cerradaEn: expect.any(String),
        cerradaPorId: auditor.usuarioId,
        cerradaPor: {
          id: auditor.usuarioId,
          nombre: 'Fixture',
          apellido: 'E2E',
        },
        ejecutadaPor: {
          id: auditor.usuarioId,
          nombre: 'Fixture',
          apellido: 'E2E',
        },
        conclusion: 'Se observa un error de fórmula',
        estadoFinal: 'CON_OBSERVACIONES',
        observaciones: { abiertas: 0, confirmadas: 1, descartadas: 1 },
      });
      expect(await estadoEnBase()).toBe('CON_OBSERVACIONES');
      const [fila] = await dataSource.query(
        `SELECT * FROM ejecuciones_auditoria WHERE cuenta_mensual_id = $1 ORDER BY id DESC LIMIT 1`,
        [cuentaId],
      );
      expect(fila).toMatchObject({
        cerrada_por_id: auditor.usuarioId,
        conclusion: 'Se observa un error de fórmula',
        estado_final: 'CON_OBSERVACIONES',
      });
      //lo mismo que devuelve consultar la ejecución
      expect((await ejecucion().expect(200)).body).toEqual(res.body);
    });

    it('si se descartaron todas la rendición queda AUDITADA', async () => {
      const { v2, c6 } = await prepararAuditoria();
      await revisar(v2.id, {
        decision: 'DESCARTAR',
        motivo: 'Motivo 1',
      }).expect(200);
      await revisar(c6.id, {
        decision: 'DESCARTAR',
        motivo: 'Motivo 2',
      }).expect(200);

      const res = await cerrar({
        conclusion: 'Sin observaciones firmes',
      }).expect(200);

      expect(res.body.estadoFinal).toBe('AUDITADA');
      expect(await estadoEnBase()).toBe('AUDITADA');
    });

    it('queda en la bitácora a nombre del auditor, con el estado final y los conteos', async () => {
      const { v2, c6 } = await prepararAuditoria();
      await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);
      await revisar(c6.id, { decision: 'CONFIRMAR' }).expect(200);
      await cerrar({ conclusion: 'Conclusión' }).expect(200);

      const [evento] = await dataSource.query(
        `SELECT * FROM registro_actividad WHERE accion = 'AUDITORIA_CERRADA' AND cuenta_mensual_id = $1 ORDER BY id DESC LIMIT 1`,
        [cuentaId],
      );

      expect(evento).toMatchObject({
        resultado: 'EXITO',
        usuario_id: auditor.usuarioId,
        organismo_id: organismoId,
        detalle: {
          estadoFinal: 'CON_OBSERVACIONES',
          confirmadas: 2,
          descartadas: 0,
        },
      });
    });

    it('cerrada la auditoría, ya no se puede revisar, volver a ejecutar ni cerrar de nuevo', async () => {
      const { v2, c6 } = await prepararAuditoria();
      await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(200);
      await revisar(c6.id, { decision: 'CONFIRMAR' }).expect(200);
      await cerrar({ conclusion: 'Conclusión' }).expect(200);
      const mensaje = 'La auditoría de esta rendición ya fue cerrada.';

      expect(
        (await revisar(v2.id, { decision: 'REABRIR' }).expect(409)).body
          .message,
      ).toBe(mensaje);
      expect((await auditar().expect(409)).body.message).toBe(mensaje);
      expect(
        (await cerrar({ conclusion: 'Otra' }).expect(409)).body.message,
      ).toBe(mensaje);
      expect(await estadoEnBase()).toBe('CON_OBSERVACIONES');
    });

    it('409: una rendición que nadie tomó todavía no se puede cerrar ni revisar', async () => {
      const { v2 } = await prepararAuditoria();
      //vuelve a quedar presentada y sin tomar
      await dataSource.query(
        `UPDATE cuentas_mensuales SET estado = 'LISTO_PARA_AUDITAR' WHERE id = $1`,
        [cuentaId],
      );

      const cierre = await cerrar({ conclusion: 'Conclusión' }).expect(409);
      const revision = await revisar(v2.id, { decision: 'CONFIRMAR' }).expect(
        409,
      );

      expect(cierre.body.message).toBe(
        'La auditoría de esta rendición no está en curso.',
      );
      expect(revision.body.message).toBe(
        'La auditoría de esta rendición no está en curso.',
      );
    });

    it('un ADMIN también puede revisar y cerrar', async () => {
      const { v2, c6 } = await prepararAuditoria();
      const bearerAdmin = await obtenerBearerAdmin(app);

      await revisar(
        v2.id,
        { decision: 'DESCARTAR', motivo: 'Motivo' },
        bearerAdmin,
      ).expect(200);
      await revisar(
        c6.id,
        { decision: 'DESCARTAR', motivo: 'Motivo' },
        bearerAdmin,
      ).expect(200);
      const res = await cerrar(
        { conclusion: 'Cerrada por el admin' },
        cuentaId,
        bearerAdmin,
      ).expect(200);

      expect(res.body.estadoFinal).toBe('AUDITADA');
    });
  });
});
