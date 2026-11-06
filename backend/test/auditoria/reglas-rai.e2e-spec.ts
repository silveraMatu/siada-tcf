import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  EJERCICIO,
  crearAuditorConSesion,
  crearResponsableConSesion,
  obtenerOrganismoRaiId,
  reiniciarAuditoria,
  resolverCuentaMensualId,
} from '../helpers/fixtures.js';

interface Observacion {
  id: number;
  codigoRegla: string;
  tipo: string;
  libroOrigen: string;
  estado: string;
  transaccionId: number | null;
  transaccionIngresoEgresoId: number | null;
  transaccionRaciId: number | null;
  transaccionRaiId: number | null;
  valorInformado: number | null;
  valorCalculado: number | null;
  diferencia: number | null;
  descripcion: string;
}
interface Resultado {
  codigoRegla: string;
  estado: string;
  filasEvaluadas: number | null;
  librosFaltantes: string[];
  observaciones: Observacion[];
}

const CODIGOS = [
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'P1',
  'P2',
  'P3',
  'F1',
];
const DEL_RACI = ['V4', 'V5', 'V6', 'C1', 'C2', 'P1', 'P2'];

//Corre contra la base de datos real y NO limpia lo que crea. Usa el organismo propio del RAI: sus meses 2 y 3 no los
//toca ningún otro spec. Las dos rendiciones llevan banco, ingresos y egresos y RAI (sin RACI, que es opcional): las
//fechas son del mes de cada una y la base de cada libro, el saldo anterior, es del mes previo y no se revisa. La del
//mes 2 cumple todas las reglas que pueden correr y la del mes 3 tiene sembrados los hallazgos del RAI.
describe('Reglas del RAI (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let organismoId: number;
  let auditor: { bearer: string; usuarioId: number };
  let bearerResponsable: string;

  const api = () => request(app.getHttpServer());
  const auditar = (cuentaId: number) =>
    api()
      .post(
        `/api/v1/auditoria/cuentas-mensuales/${cuentaId}/documentos/auditar`,
      )
      .set('Authorization', auditor.bearer);
  const observaciones = async (cuentaId: number): Promise<Observacion[]> =>
    (
      await api()
        .get(`/api/v1/auditoria/cuentas-mensuales/${cuentaId}/observaciones`)
        .set('Authorization', auditor.bearer)
        .expect(200)
    ).body;

  //fecha del día `dia` del mes `mes`
  const fecha = (mes: number, dia: number) =>
    `${EJERCICIO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  //banco: dos depósitos (300 y 200) sobre un saldo de 1000
  const libroBanco = (mes: number) => ({
    numeroCuentaCte: '999-RAI/E2E',
    reemplazar: true,
    transacciones: [
      {
        fecha: fecha(mes - 1, 28),
        aLaOrdenDe: 'Saldo anterior',
        depositos: 0,
        retiro: 0,
        saldo: 1000,
      },
      {
        fecha: fecha(mes, 5),
        aLaOrdenDe: 'Coparticipación',
        depositos: 300,
        retiro: 0,
        saldo: 1300,
      },
      {
        fecha: fecha(mes, 12),
        aLaOrdenDe: 'Tasas',
        depositos: 200,
        retiro: 0,
        saldo: 1500,
      },
    ],
  });
  const filaIE = (fila: number, fechaFila: string, extra: object) => ({
    fila,
    fecha: fechaFila,
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
  //los 300 entran por la columna municipal y los 200 por otras
  const ingresosEgresos = (mes: number) => ({
    reemplazar: true,
    transacciones: [
      filaIE(1, fecha(mes - 1, 28), { bancoSaldo: 1000 }),
      filaIE(2, fecha(mes, 5), {
        bancoDebe: 300,
        bancoSaldo: 1300,
        ingresoMunicipal: 300,
      }),
      filaIE(3, fecha(mes, 12), {
        bancoDebe: 200,
        bancoSaldo: 1500,
        ingresoOtras: 200,
      }),
    ],
  });

  //un ingreso del RAI: el mensual y el acumulado se informan como los calcularía la planilla (total autorizado 10.000)
  const ingreso = (
    fechaAsiento: string,
    diario: number,
    mensual: number,
    acumulado: number,
    extra: Record<string, unknown> = {},
  ) => ({
    fecha: fechaAsiento,
    concepto: `Ingreso del ${fechaAsiento}`,
    ingresosDiarios: diario,
    ingresosMensuales: mensual,
    ingresosAcumulados: acumulado,
    saldo: 10000 - acumulado,
    ...extra,
  });
  const raiLimpio = (mes: number) => [
    ingreso(fecha(mes, 5), 300, 300, 300),
    ingreso(fecha(mes, 12), 200, 500, 500),
  ];

  const cargarRendicion = async (
    cuentaId: number,
    mes: number,
    rai: object[],
  ) => {
    await reiniciarAuditoria(dataSource, cuentaId, 'EN_BORRADOR');
    await api()
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/libro-banco/ingestar`)
      .set('Authorization', bearerResponsable)
      .send(libroBanco(mes))
      .expect(201);
    await api()
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/ingresos-egresos/ingestar`)
      .set('Authorization', bearerResponsable)
      .send(ingresosEgresos(mes))
      .expect(201);
    const cargado = await api()
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/rai/ingestar`)
      .set('Authorization', bearerResponsable)
      .send({ reemplazar: true, transacciones: rai })
      .expect(201);
    await api()
      .patch(`/api/v1/cuentas-mensuales/${cuentaId}/presentar`)
      .set('Authorization', bearerResponsable)
      .expect(200);
    return cargado.body.transacciones as { id: number; concepto: string }[];
  };

  let cuentaLimpiaId: number;
  let cuentaConErroresId: number;
  let asientos: { id: number; concepto: string }[];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoRaiId(dataSource);
    auditor = await crearAuditorConSesion(app, organismoId);
    bearerResponsable = (await crearResponsableConSesion(app, organismoId))
      .bearer;

    cuentaLimpiaId = await resolverCuentaMensualId(app, organismoId, 2);
    cuentaConErroresId = await resolverCuentaMensualId(app, organismoId, 3);

    await cargarRendicion(cuentaLimpiaId, 2, raiLimpio(2));
    asientos = await cargarRendicion(cuentaConErroresId, 3, [
      ...raiLimpio(3),
      //un ingreso que el libro de ingresos y egresos no tiene (P3) y que suma al total del RAI (C3)
      ingreso(fecha(3, 15), 77.7, 577.7, 577.7),
      //con la fecha de febrero en la rendición de marzo (F1), también sin registro en el mayor (P3), y con el
      //ingreso mensual mal sumado (V7: en febrero el total es 10 y se informa 600)
      ingreso(fecha(2, 27), 10, 600, 587.7),
    ]);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  it('una rendición que cumple todo da las 17 reglas, con el RACI (opcional) esperando su libro', async () => {
    const res = await auditar(cuentaLimpiaId).expect(200);
    const resultados: Resultado[] = res.body;

    expect(resultados.map((r) => [r.codigoRegla, r.estado])).toEqual(
      CODIGOS.map((codigo) => [
        codigo,
        DEL_RACI.includes(codigo) ? 'FALTAN_LIBROS' : 'VERIFICADO',
      ]),
    );
    const filas = Object.fromEntries(
      resultados.map((r) => [r.codigoRegla, r.filasEvaluadas]),
    );
    //V7: 1 mes; C3: 1 comparación; P3: 2 ingresos; F1: 2 filas de banco, 2 de I/E y 2 ingresos del RAI
    expect(filas).toMatchObject({ V7: 1, C3: 1, P3: 2, F1: 6 });
    expect(await observaciones(cuentaLimpiaId)).toEqual([]);
  });

  describe('con los hallazgos sembrados', () => {
    let resultados: Resultado[];

    it('cada regla del RAI marca solo lo suyo', async () => {
      const res = await auditar(cuentaConErroresId).expect(200);
      resultados = res.body;

      expect(resultados.map((r) => [r.codigoRegla, r.estado])).toEqual(
        CODIGOS.map((codigo) => [
          codigo,
          DEL_RACI.includes(codigo)
            ? 'FALTAN_LIBROS'
            : ['V7', 'C3', 'P3', 'F1'].includes(codigo)
              ? 'FALLO'
              : 'VERIFICADO',
        ]),
      );
    });

    it('los hallazgos de fila apuntan al asiento del RAI y el cruce a toda la cuenta', async () => {
      const idDe = (fechaAsiento: string) =>
        asientos.find((a) => a.concepto === `Ingreso del ${fechaAsiento}`)!.id;
      const de = (codigo: string) =>
        resultados.find((r) => r.codigoRegla === codigo)!.observaciones;

      const sinRegistro = idDe(fecha(3, 15));
      const deFebrero = idDe(fecha(2, 27));

      expect(de('V7')).toHaveLength(1);
      expect(de('V7')[0]).toMatchObject({
        tipo: 'INTERNA',
        libroOrigen: 'RAI',
        transaccionRaiId: deFebrero,
        transaccionRaciId: null,
        transaccionId: null,
        transaccionIngresoEgresoId: null,
        valorInformado: 600,
        valorCalculado: 10,
        diferencia: 590,
      });
      expect(de('P3').map((o) => o.transaccionRaiId)).toEqual([
        sinRegistro,
        deFebrero,
      ]);
      expect(de('P3')[0]).toMatchObject({
        tipo: 'INTEGRIDAD',
        libroOrigen: 'RAI',
        valorInformado: 77.7,
        valorCalculado: 0,
        diferencia: 77.7,
      });
      expect(de('F1')).toHaveLength(1);
      expect(de('F1')[0]).toMatchObject({
        tipo: 'FECHAS',
        libroOrigen: 'RAI',
        transaccionRaiId: deFebrero,
      });
      //C3: 300 + 200 + 77,70 + 10 contra 500 del I/E
      expect(de('C3')).toEqual([
        expect.objectContaining({
          tipo: 'CRUZAMIENTO',
          libroOrigen: 'RAI',
          transaccionRaiId: null,
          valorInformado: 587.7,
          valorCalculado: 500,
          diferencia: 87.7,
        }),
      ]);
    });

    it('GET observaciones trae las cinco y ejecutar de nuevo no duplica ninguna', async () => {
      const lista = await observaciones(cuentaConErroresId);
      expect(lista.map((o) => o.codigoRegla).sort()).toEqual([
        'C3',
        'F1',
        'P3',
        'P3',
        'V7',
      ]);

      await auditar(cuentaConErroresId).expect(200);
      expect(await observaciones(cuentaConErroresId)).toHaveLength(5);
    });

    it('un hallazgo del RAI se confirma, otro se descarta con motivo y la auditoría se cierra con observaciones', async () => {
      const lista = await observaciones(cuentaConErroresId);
      const revisar = (id: number, cuerpo: object) =>
        api()
          .patch(`/api/v1/auditoria/observaciones/${id}`)
          .set('Authorization', auditor.bearer)
          .send(cuerpo);
      const cerrar = () =>
        api()
          .post(
            `/api/v1/auditoria/cuentas-mensuales/${cuentaConErroresId}/cerrar`,
          )
          .set('Authorization', auditor.bearer)
          .send({ conclusion: 'Cierre del e2e de las reglas del RAI' });

      await cerrar().expect(409);
      for (const o of lista) {
        if (o.codigoRegla === 'F1') {
          await revisar(o.id, {
            decision: 'DESCARTAR',
            motivo: 'El ingreso de febrero se asentó en marzo',
          }).expect(200);
        } else {
          await revisar(o.id, { decision: 'CONFIRMAR' }).expect(200);
        }
      }

      const cierre = await cerrar().expect(200);
      expect(cierre.body.estadoFinal).toBe('CON_OBSERVACIONES');
      expect(cierre.body.observaciones).toEqual({
        abiertas: 0,
        confirmadas: 4,
        descartadas: 1,
      });
    });
  });
});
