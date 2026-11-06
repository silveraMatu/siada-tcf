import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app.js';
import {
  EJERCICIO,
  crearAuditorConSesion,
  crearResponsableConSesion,
  obtenerOrganismoReglasRaciId,
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

//Corre contra la base de datos real y NO limpia lo que crea. Usa un organismo propio: sus meses 1 y 2 no los toca
//ningún otro spec. Las dos rendiciones llevan banco, ingresos y egresos y RACI; las fechas son del mes de cada una
//(la base de cada libro, el saldo anterior, es del mes previo y no se revisa). La del mes 1 cumple las 14 reglas
//y la del mes 2 tiene sembrados los hallazgos del RACI.
describe('Reglas del RACI y de fechas (e2e)', () => {
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

  //fecha del día `dia` del mes `mes` (0 = diciembre del ejercicio anterior)
  const fecha = (mes: number, dia: number) =>
    mes === 0
      ? `${EJERCICIO - 1}-12-${String(dia).padStart(2, '0')}`
      : `${EJERCICIO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  //banco: cheques 123 (con ceros a la izquierda) y 124
  const libroBanco = (mes: number) => ({
    numeroCuentaCte: '999-RACI/E2E',
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
        fecha: fecha(mes, 10),
        cheque: '000123',
        aLaOrdenDe: 'Proveedor A',
        depositos: 0,
        retiro: 200,
        saldo: 800,
      },
      {
        fecha: fecha(mes, 12),
        cheque: '124',
        aLaOrdenDe: 'Proveedor B',
        depositos: 0,
        retiro: 100,
        saldo: 700,
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
  const ingresosEgresos = (mes: number) => ({
    reemplazar: true,
    transacciones: [
      filaIE(1, fecha(mes - 1, 28), { bancoSaldo: 1000 }),
      filaIE(2, fecha(mes, 10), {
        bancoHaber: 200,
        bancoSaldo: 800,
        egresoInc1: 200,
      }),
      filaIE(3, fecha(mes, 12), {
        bancoHaber: 100,
        bancoSaldo: 700,
        egresoInc1: 100,
      }),
    ],
  });

  //un asiento del RACI; los acumulados se informan como los calcularía la planilla
  const asiento = (
    n: number,
    fechaAsiento: string,
    extra: Record<string, unknown>,
  ) => ({
    asiento: n,
    fecha: fechaAsiento,
    concepto: `Asiento ${n}`,
    compromisoDelMes: 0,
    compromisoAcumulado: 0,
    devengadoDelMes: 0,
    devengadoAcumulado: 0,
    devengadoSaldo: 0,
    pagoDelMes: 0,
    pagoAcumulado: 0,
    pagoSaldoAPagar: 0,
    ...extra,
  });
  //dos gastos (200 pagados con el cheque 123 y 100 con el 124), cada etapa en su asiento
  const gastoA = (mes: number) => [
    asiento(1, fecha(mes - 1, 28), {}),
    asiento(2, fecha(mes, 5), {
      compromisoDelMes: 200,
      compromisoAcumulado: 200,
    }),
    asiento(3, fecha(mes, 8), {
      devengadoDelMes: 200,
      compromisoAcumulado: 200,
      devengadoAcumulado: 200,
    }),
    asiento(4, fecha(mes, 10), {
      pagoDelMes: 200,
      pagoNumeroCheque: '123',
      compromisoAcumulado: 200,
      devengadoAcumulado: 200,
      pagoAcumulado: 200,
    }),
    asiento(5, fecha(mes, 9), {
      compromisoDelMes: 100,
      compromisoAcumulado: 300,
      devengadoAcumulado: 200,
      pagoAcumulado: 200,
    }),
    asiento(6, fecha(mes, 11), {
      devengadoDelMes: 100,
      compromisoAcumulado: 300,
      devengadoAcumulado: 300,
      pagoAcumulado: 200,
    }),
  ];
  const pagoDelCheque124 = (mes: number, monto: number) =>
    asiento(7, fecha(mes, 12), {
      pagoDelMes: monto,
      pagoNumeroCheque: '124',
      compromisoAcumulado: 300,
      devengadoAcumulado: 300,
      pagoAcumulado: 200 + monto,
    });

  const cargarRendicion = async (
    cuentaId: number,
    mes: number,
    raci: object[],
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
      .post(`/api/v1/cuentas-mensuales/${cuentaId}/raci/ingestar`)
      .set('Authorization', bearerResponsable)
      .send({ reemplazar: true, transacciones: raci })
      .expect(201);
    await api()
      .patch(`/api/v1/cuentas-mensuales/${cuentaId}/presentar`)
      .set('Authorization', bearerResponsable)
      .expect(200);
    return cargado.body.transacciones as { id: number; asiento: number }[];
  };

  let cuentaLimpiaId: number;
  let cuentaConErroresId: number;
  let asientos: { id: number; asiento: number }[];

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    organismoId = await obtenerOrganismoReglasRaciId(dataSource);
    auditor = await crearAuditorConSesion(app, organismoId);
    bearerResponsable = (await crearResponsableConSesion(app, organismoId))
      .bearer;

    cuentaLimpiaId = await resolverCuentaMensualId(app, organismoId, 1);
    cuentaConErroresId = await resolverCuentaMensualId(app, organismoId, 2);

    await cargarRendicion(cuentaLimpiaId, 1, [
      ...gastoA(1),
      pagoDelCheque124(1, 100),
    ]);
    asientos = await cargarRendicion(cuentaConErroresId, 2, [
      ...gastoA(2),
      //pago de 90 con el cheque 124: el banco retiró 100 (P2) y el total pagado con cheque no coincide (C2)
      pagoDelCheque124(2, 90),
      //pago sin devengado ni compromiso (V4) que supera lo devengado (V6), con un cheque que el banco no tiene
      //(P1) y con la fecha de enero en la rendición de febrero (F1)
      asiento(8, fecha(1, 30), {
        pagoDelMes: 50,
        pagoNumeroCheque: '999',
        pagoAcumulado: 50,
      }),
      //devengado acumulado 400 sobre un compromiso acumulado de 300 (V5); el devengado del mes suma 400 contra
      //300 de egresos (C1)
      asiento(9, fecha(2, 13), {
        devengadoDelMes: 100,
        compromisoAcumulado: 300,
        devengadoAcumulado: 400,
        pagoAcumulado: 290,
      }),
    ]);
  });

  afterAll(async () => {
    //sin limpieza de datos a proposito: solo se cierra la aplicacion
    await app.close();
  });

  it('una rendición que cumple todo da VERIFICADO en las reglas del RACI y espera el RAI (opcional) en las suyas', async () => {
    const res = await auditar(cuentaLimpiaId).expect(200);
    const resultados: Resultado[] = res.body;

    //esta rendición no cargó el RAI: V7, C3 y P3 esperan ese libro
    const delRai = ['V7', 'C3', 'P3'];
    expect(resultados.map((r) => [r.codigoRegla, r.estado])).toEqual(
      CODIGOS.map((codigo) => [
        codigo,
        delRai.includes(codigo) ? 'FALTAN_LIBROS' : 'VERIFICADO',
      ]),
    );
    expect(
      resultados
        .filter((r) => delRai.includes(r.codigoRegla))
        .every((r) => r.librosFaltantes.includes('RAI')),
    ).toBe(true);
    //V4–V6 miran los 7 asientos; P1 y P2 los 2 con cheque; F1 2 filas de banco, 2 de I/E y 6 asientos con movimiento
    const filas = Object.fromEntries(
      resultados.map((r) => [r.codigoRegla, r.filasEvaluadas]),
    );
    expect(filas).toMatchObject({ V4: 7, V5: 7, V6: 7, P1: 2, P2: 2, F1: 10 });
    expect(await observaciones(cuentaLimpiaId)).toEqual([]);
  });

  describe('con los hallazgos sembrados', () => {
    let resultados: Resultado[];

    it('cada regla del RACI marca solo lo suyo', async () => {
      const res = await auditar(cuentaConErroresId).expect(200);
      resultados = res.body;

      expect(resultados.map((r) => [r.codigoRegla, r.estado])).toEqual([
        ['V1', 'VERIFICADO'],
        ['V2', 'VERIFICADO'],
        ['V3', 'VERIFICADO'],
        ['V4', 'FALLO'],
        ['V5', 'FALLO'],
        ['V6', 'FALLO'],
        ['V7', 'FALTAN_LIBROS'],
        ['C1', 'FALLO'],
        ['C2', 'FALLO'],
        ['C3', 'FALTAN_LIBROS'],
        ['C4', 'VERIFICADO'],
        ['C5', 'VERIFICADO'],
        ['C6', 'VERIFICADO'],
        ['P1', 'FALLO'],
        ['P2', 'FALLO'],
        ['P3', 'FALTAN_LIBROS'],
        ['F1', 'FALLO'],
      ]);
    });

    it('los hallazgos de fila apuntan al asiento del RACI y los cruces a toda la cuenta', async () => {
      const idDe = (n: number) => asientos.find((a) => a.asiento === n)!.id;
      const de = (codigo: string) =>
        resultados.find((r) => r.codigoRegla === codigo)!.observaciones;

      for (const [codigo, asiento] of [
        ['V4', 8],
        ['V5', 9],
        ['V6', 8],
        ['P1', 8],
        ['P2', 7],
        ['F1', 8],
      ] as const) {
        expect(de(codigo)).toHaveLength(1);
        expect(de(codigo)[0]).toMatchObject({
          libroOrigen: 'RACI',
          estado: 'ABIERTA',
          transaccionRaciId: idDe(asiento),
          transaccionId: null,
          transaccionIngresoEgresoId: null,
        });
      }
      expect(de('P2')[0]).toMatchObject({
        tipo: 'INTEGRIDAD',
        valorInformado: 90,
        valorCalculado: 100,
        diferencia: 10,
      });
      expect(de('V5')[0]).toMatchObject({
        valorInformado: 400,
        valorCalculado: 300,
        diferencia: 100,
      });
      expect(de('F1')[0].tipo).toBe('FECHAS');

      expect(de('C1')).toEqual([
        expect.objectContaining({
          tipo: 'CRUZAMIENTO',
          libroOrigen: 'RACI',
          transaccionRaciId: null,
          valorInformado: 400,
          valorCalculado: 300,
          diferencia: 100,
        }),
      ]);
      //pagado con cheque: 200 + 90 + 50 contra 300 de banco haber
      expect(de('C2')[0]).toMatchObject({
        valorInformado: 340,
        valorCalculado: 300,
        diferencia: 40,
      });
    });

    it('GET observaciones trae las ocho y ejecutar de nuevo no duplica ninguna', async () => {
      const primera = await observaciones(cuentaConErroresId);
      expect(primera.map((o) => o.codigoRegla).sort()).toEqual([
        'C1',
        'C2',
        'F1',
        'P1',
        'P2',
        'V4',
        'V5',
        'V6',
      ]);

      await auditar(cuentaConErroresId).expect(200);
      expect(await observaciones(cuentaConErroresId)).toHaveLength(8);
    });

    it('un hallazgo del RACI se confirma, otro se descarta con motivo y la auditoría se cierra con observaciones', async () => {
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
          .send({ conclusion: 'Cierre del e2e de las reglas del RACI' });

      await cerrar().expect(409);
      for (const o of lista) {
        if (o.codigoRegla === 'F1') {
          await revisar(o.id, {
            decision: 'DESCARTAR',
            motivo: 'El asiento 8 es un ajuste de enero',
          }).expect(200);
        } else {
          await revisar(o.id, { decision: 'CONFIRMAR' }).expect(200);
        }
      }

      const cierre = await cerrar().expect(200);
      expect(cierre.body.estadoFinal).toBe('CON_OBSERVACIONES');
      expect(cierre.body.observaciones).toEqual({
        abiertas: 0,
        confirmadas: 7,
        descartadas: 1,
      });
    });
  });
});
