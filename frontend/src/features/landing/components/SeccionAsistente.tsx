import {
  conciliar,
  formatearImporte,
  rendicionIlustrativa,
} from '../data/rendicionIlustrativa';
import { Folio } from './Folio';
import { Ilustrativo } from './Ilustrativo';

const UMBRAL = 200000;

export function SeccionAsistente() {
  const rendicion = rendicionIlustrativa;
  const { diferencia } = conciliar(rendicion);
  const retirosMayores = rendicion.movimientos
    .map((m, i) => ({ ...m, renglon: i + 1 }))
    .filter((m) => (m.retiro ?? 0) > UMBRAL);

  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5 lg:order-2">
          <h2 className="font-prensa text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-balance">
            Una IA que consulta y cita. No dictamina.
          </h2>
          <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            Pregunte en lenguaje natural por los movimientos de una rendición.
            Cada respuesta indica el renglón de origen, para que usted pueda
            comprobarla en la planilla.
          </p>
          <p className="mt-4 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            La IA propone borradores; la observación y el dictamen los firma el
            delegado fiscal.
          </p>
        </div>

        <figure className="lg:col-span-7 lg:order-1">
          <div className="border border-border bg-card p-6 text-card-foreground shadow-[0_28px_50px_-26px_rgba(0,0,0,0.25),0_2px_5px_rgba(0,0,0,0.08)] dark:ring-1 dark:ring-white/15 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
              <h3 className="font-prensa text-base font-extrabold">
                Consulta del delegado fiscal
              </h3>
              <Folio numero={16} />
            </div>

            <p className="mt-5 font-prensa text-lg font-bold leading-snug">
              ¿Qué retiros de marzo superan los $ {formatearImporte(UMBRAL)}?
            </p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="font-prensa text-sm font-bold text-violet-800 dark:text-violet-300">
                Respuesta
              </p>
              {retirosMayores.map((m) => (
                <p key={m.fecha} className="mt-2 text-base leading-snug">
                  <span className="font-maquina">
                    {m.fecha} · {m.concepto} · ${' '}
                    {formatearImporte(m.retiro ?? 0)}
                  </span>
                  <span className="mt-1 block font-maquina text-xs text-muted-foreground">
                    Fuente: Fs. 14, renglón {m.renglon}
                  </span>
                </p>
              ))}
            </div>

            <p className="mt-8 font-prensa text-lg font-bold leading-snug">
              Redacte un borrador de observación sobre la diferencia de saldo.
            </p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="font-prensa text-sm font-bold text-violet-800 dark:text-violet-300">
                Borrador para revisión del delegado
              </p>
              <p className="mt-2 text-base leading-relaxed">
                «El saldo informado difiere en $ {formatearImporte(diferencia)}{' '}
                del saldo que surge de los movimientos del período. Se solicita
                al organismo la aclaración correspondiente.»
              </p>
            </div>
          </div>
          <figcaption className="mt-3">
            <Ilustrativo className="text-muted-foreground" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
