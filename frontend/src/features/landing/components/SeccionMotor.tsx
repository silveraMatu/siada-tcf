import { useAlEntrar } from '../hooks/useAlEntrar';
import {
  conciliar,
  formatearImporte,
  rendicionIlustrativa,
} from '../data/rendicionIlustrativa';
import { Folio } from './Folio';
import { Ilustrativo } from './Ilustrativo';
import { Sello } from './Sello';

const controles = [
  'Saldo anterior, depósitos y retiros contra el saldo informado.',
  'Cada observación muestra el cálculo que la origina.',
  'Ante los mismos datos, siempre el mismo resultado.',
];

const importe = (n: number) => `$\u00a0${formatearImporte(n)}`;
const retraso = (ms: number) => ({ animationDelay: `${ms}ms` });

export function SeccionMotor() {
  const rendicion = rendicionIlustrativa;
  const r = conciliar(rendicion);
  const retiros = rendicion.movimientos
    .map((m) => m.retiro)
    .filter((n): n is number => n !== null);
  const { ref, fase } = useAlEntrar<HTMLDivElement>();

  const pasos = [
    {
      titulo: 'Se suman los retiros del período',
      cuenta: `${retiros.map(formatearImporte).join(' + ')} = ${importe(r.totalRetiros)}`,
    },
    {
      titulo: 'Se calcula el saldo que debería resultar',
      cuenta: `${importe(rendicion.saldoAnterior)} + ${importe(r.totalDepositos)} − ${importe(r.totalRetiros)} = ${importe(r.saldoCalculado)}`,
    },
    {
      titulo: 'Se compara con el saldo informado',
      cuenta: `${importe(rendicion.saldoInformado)} − ${importe(r.saldoCalculado)} = ${importe(r.diferencia)}`,
    },
  ];

  const oculta = fase === 'oculta';
  const animada = fase === 'animada';

  return (
    <section className="bg-muted/40 text-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 className="font-prensa text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-balance">
            El motor revisa las cifras. Usted ve qué encontró y por qué.
          </h2>
          <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            Un motor determinístico cruza los saldos, los depósitos y los
            retiros de cada rendición y señala lo que no cuadra. No estima ni
            adivina: aplica reglas explícitas que el delegado puede seguir paso
            a paso.
          </p>
          <ul className="mt-8 space-y-3">
            {controles.map((texto) => (
              <li
                key={texto}
                className="flex gap-3 border-t border-border pt-3 text-base leading-snug"
              >
                <span
                  aria-hidden
                  className="mt-[3px] size-2 shrink-0 bg-violet-800 dark:bg-violet-300"
                />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <figure className="lg:col-span-7">
          <div
            ref={ref}
            className="relative border border-border bg-card p-6 text-card-foreground shadow-[0_28px_50px_-26px_rgba(0,0,0,0.25),0_2px_5px_rgba(0,0,0,0.08)] dark:ring-1 dark:ring-white/15 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
              <h3 className="font-prensa text-base font-extrabold">
                Papel de trabajo: de dónde sale la observación
              </h3>
              <Folio numero={15} />
            </div>

            <ol className="mt-5 space-y-5">
              {pasos.map(({ titulo, cuenta }, i) => (
                <li
                  key={titulo}
                  className={
                    'grid grid-cols-[1.75rem_1fr] gap-x-3 ' +
                    (oculta ? 'opacity-0 ' : '') +
                    (animada ? 'animate-fila-in' : '')
                  }
                  style={animada ? retraso(i * 420) : undefined}
                >
                  <span className="font-maquina text-sm font-bold text-violet-800 dark:text-violet-300">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="font-prensa text-base font-bold leading-snug">
                      {titulo}
                    </p>
                    <p className="mt-1 break-words font-maquina text-[13px] leading-relaxed tabular-nums sm:text-sm">
                      {cuenta}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div
              className={
                'relative mt-6 flex items-baseline justify-between gap-4 border-t-2 border-foreground pt-4 font-maquina text-sm font-bold text-red-700 dark:text-red-400 sm:text-base ' +
                (oculta ? 'opacity-0 ' : '') +
                (animada ? 'animate-fila-in' : '')
              }
              style={animada ? retraso(1400) : undefined}
            >
              <span>Diferencia</span>
              <span className="tabular-nums">
                {formatearImporte(r.diferencia)}
              </span>
              <Sello
                tono="rojo"
                className={
                  'absolute -bottom-2 right-24 rounded-sm text-xl [rotate:-6deg] sm:right-28 ' +
                  (oculta ? 'opacity-0 ' : '') +
                  (animada ? 'animate-sello-in' : '')
                }
                style={animada ? retraso(1900) : undefined}
              >
                Observado
              </Sello>
            </div>
            <p className="mt-8 max-w-[52ch] text-sm leading-snug text-muted-foreground">
              La observación conserva el cálculo completo: el delegado puede
              repetirlo y llegar al mismo resultado.
            </p>
          </div>
          <figcaption className="mt-3">
            <Ilustrativo className="text-muted-foreground" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
