import {
  conciliar,
  formatearImporte,
  rendicionIlustrativa,
} from '../data/rendicionIlustrativa';
import { Ilustrativo } from './Ilustrativo';
import { MarcaLapiz } from './MarcaLapiz';
import { Folio } from './Folio';
import { Sello } from './Sello';

const INICIO_FILAS = 650;
const PASO_FILA = 240;

const retraso = (ms: number) => ({ animationDelay: `${ms}ms` });

export function PlanillaHero() {
  const rendicion = rendicionIlustrativa;
  const resultado = conciliar(rendicion);
  const inicioResumen = INICIO_FILAS + rendicion.movimientos.length * PASO_FILA;
  const inicioSello = inicioResumen + 1100;

  return (
    <figure className="relative mx-auto w-full max-w-[540px] pb-4 pr-3 lg:mr-0">
      <div
        aria-hidden
        className="absolute inset-0 bg-[#d9dcec] [rotate:1.4deg] [translate:12px_12px] motion-safe:animate-foja-in"
        style={retraso(160)}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[#eceef6] [rotate:-0.9deg] [translate:6px_6px] motion-safe:animate-foja-in"
        style={retraso(80)}
      />
      <article className="relative bg-foja p-5 pb-8 text-tinta shadow-[0_34px_60px_-24px_rgba(6,8,36,0.7),0_2px_6px_rgba(6,8,36,0.18)] motion-safe:animate-foja-in sm:p-7 sm:pb-9">
        <header className="flex items-start justify-between gap-4 border-b-2 border-tinta pb-4">
          <div>
            <h2 className="font-prensa text-lg font-extrabold leading-tight sm:text-xl">
              Libro Banco · {rendicion.periodo}
            </h2>
            <p className="font-maquina text-xs text-tinta/70">
              {rendicion.organismo}
            </p>
            <Ilustrativo className="mt-0.5 text-sello-violeta" />
          </div>
          <Folio numero={14} />
        </header>

        <table className="mt-4 w-full border-collapse font-maquina text-[12.5px] sm:text-[13px]">
          <caption className="sr-only">
            Movimientos del Libro Banco de {rendicion.periodo}
          </caption>
          <thead>
            <tr className="border-b border-lapiz text-left text-[11px] uppercase tracking-wider text-tinta/70 sm:text-xs">
              <th scope="col" className="w-5 py-1.5" />
              <th scope="col" className="py-1.5 pr-2 font-normal">
                Fecha
              </th>
              <th scope="col" className="py-1.5 pr-2 font-normal">
                Concepto
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-normal">
                Depósitos
              </th>
              <th scope="col" className="py-1.5 text-right font-normal">
                Retiros
              </th>
            </tr>
          </thead>
          <tbody>
            {rendicion.movimientos.map((m, i) => {
              const inicio = INICIO_FILAS + i * PASO_FILA;
              return (
                <tr
                  key={m.fecha}
                  className="border-b border-lapiz/70 align-top motion-safe:animate-fila-in"
                  style={retraso(inicio)}
                >
                  <td className="py-2 pr-1">
                    <MarcaLapiz style={retraso(inicio + 320)} />
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{m.fecha}</td>
                  <td className="py-2 pr-2 font-prensa text-[12px] leading-snug sm:text-[13px]">
                    {m.concepto}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {m.deposito ? formatearImporte(m.deposito) : ''}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {m.retiro ? formatearImporte(m.retiro) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl
          className="relative mt-4 space-y-1.5 font-maquina text-[12px] sm:text-[13px] motion-safe:animate-fila-in"
          style={retraso(inicioResumen)}
        >
          <Linea etiqueta="Saldo anterior" valor={rendicion.saldoAnterior} />
          <Linea etiqueta="+ Depósitos" valor={resultado.totalDepositos} />
          <Linea etiqueta="− Retiros" valor={resultado.totalRetiros} />
          <Linea
            etiqueta="= Saldo calculado"
            valor={resultado.saldoCalculado}
            fuerte
            marca={<MarcaLapiz style={retraso(inicioResumen + 450)} />}
          />
          <Linea etiqueta="Saldo informado" valor={rendicion.saldoInformado} />
          <Linea
            etiqueta="Diferencia"
            valor={resultado.diferencia}
            alerta
          />
          <Sello
            tono="rojo"
            className="absolute bottom-[-0.9rem] right-[4.4rem] rounded-sm text-lg [rotate:-8deg] motion-safe:animate-sello-in sm:right-[4.8rem] sm:text-2xl"
            style={retraso(inicioSello)}
          >
            Observado
          </Sello>
        </dl>

      </article>
      <figcaption className="sr-only">
        Vista ilustrativa de una rendición donde el motor marca una diferencia
        de saldo.
      </figcaption>
    </figure>
  );
}

interface LineaProps {
  etiqueta: string;
  valor: number;
  fuerte?: boolean;
  alerta?: boolean;
  marca?: React.ReactNode;
}

function Linea({ etiqueta, valor, fuerte, alerta, marca }: LineaProps) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-3 border-b border-dotted border-lapiz pb-1 ' +
        (alerta ? 'font-bold text-sello-rojo ' : '') +
        (fuerte ? 'font-bold' : '')
      }
    >
      <dt className="flex items-center gap-2">
        {marca}
        {etiqueta}
      </dt>
      <dd className="tabular-nums">{formatearImporte(valor)}</dd>
    </div>
  );
}
