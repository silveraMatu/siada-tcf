import { Folio } from './Folio';
import { Ilustrativo } from './Ilustrativo';
import { Sello } from './Sello';

const estados = [
  { tono: 'tinta', nombre: 'Pendiente', detalle: 'Cargada, sin revisión.' },
  {
    tono: 'violeta',
    nombre: 'En auditoría',
    detalle: 'El delegado la está analizando.',
  },
  { tono: 'verde', nombre: 'Aprobado', detalle: 'Dictamen emitido.' },
] as const;

const movimientos = [
  {
    fecha: '03/04',
    quien: 'Responsable',
    que: 'Cargó el Libro Banco de marzo.',
  },
  {
    fecha: '03/04',
    quien: 'Motor determinístico',
    que: 'Observó una diferencia de saldo.',
  },
  {
    fecha: '05/04',
    quien: 'Delegado fiscal',
    que: 'Pasó la rendición a En auditoría.',
  },
];

export function SeccionTrazabilidad() {
  return (
    <section className="bg-muted/40 text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <h2 className="font-prensa text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-balance">
            Cada paso queda sellado y a la vista.
          </h2>
          <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            Una rendición avanza por estados definidos y cada intervención queda
            registrada con quién la hizo y cuándo. El acceso se asigna por rol:
            administrador, juez de trámite, auditor y responsable.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <ol className="grid gap-6 sm:grid-cols-3 lg:col-span-6 lg:grid-cols-1">
            {estados.map(({ tono, nombre, detalle }) => (
              <li
                key={nombre}
                className="flex flex-col items-start gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:gap-6"
              >
                <Sello
                  tono={tono}
                  className="min-w-[10.5rem] rounded-sm text-center text-base"
                >
                  {nombre}
                </Sello>
                <span className="text-base text-muted-foreground">
                  {detalle}
                </span>
              </li>
            ))}
          </ol>

          <figure className="lg:col-span-6">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
              <h3 className="font-prensa text-base font-extrabold">
                Libro de movimientos
              </h3>
              <Folio numero={17} />
            </div>
            <ul>
              {movimientos.map(({ fecha, quien, que }) => (
                <li
                  key={`${fecha}-${quien}`}
                  className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-border py-3"
                >
                  <span className="font-maquina text-sm tabular-nums">
                    {fecha}
                  </span>
                  <span className="text-base leading-snug">
                    <strong className="font-bold">{quien}.</strong> {que}
                  </span>
                </li>
              ))}
            </ul>
            <figcaption className="mt-3">
              <Ilustrativo className="text-muted-foreground" />
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
