import { FileSpreadsheet, History, ShieldCheck, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: FileSpreadsheet,
    title: 'Ingesta Automatizada',
    description:
      'Carga ágil y validación en tiempo real de Libros Banco y rendiciones mensuales. Sin planillas engorrosas.',
  },
  {
    icon: ShieldCheck,
    title: 'Motor Determinístico',
    description:
      'Validación cruzada de saldos, depósitos y retiros. El sistema detecta anomalías contables y previene inconsistencias antes de la auditoría final.',
  },
  {
    icon: Sparkles,
    title: 'Auditoría con Inteligencia Artificial',
    description:
      'Consulte datos financieros en lenguaje natural. Nuestra IA genera reportes inteligentes y facilita el seguimiento de la gestión.',
  },
  {
    icon: History,
    title: 'Trazabilidad Absoluta',
    description:
      'Historial inmutable de estados (Pendiente, En Auditoría, Aprobado). Garantizamos el uso responsable de los recursos públicos.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="border-t border-slate-200 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Control externo, de punta a punta
          </h2>
          <p className="mt-3 text-slate-500">
            Del ingreso de la rendición a la aprobación final, cada paso queda
            validado y registrado.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
