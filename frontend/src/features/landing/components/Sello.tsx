import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Tono = 'violeta' | 'rojo' | 'verde' | 'tinta';

const TONOS: Record<Tono, string> = {
  violeta: 'text-violet-800 dark:text-violet-300',
  rojo: 'text-red-700 dark:text-red-400',
  verde: 'text-emerald-700 dark:text-emerald-400',
  tinta: 'text-muted-foreground',
};

interface SelloProps {
  tono: Tono;
  /** Sin textura de tinta: para texto pequeño que debe leerse sin esfuerzo. */
  nitido?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Sello de tinta: doble filete, mayúsculas y leve giro, como el de la mesa de entradas. */
export function Sello({
  tono,
  nitido,
  children,
  className,
  style,
}: SelloProps) {
  return (
    <span
      style={style}
      className={cn(
        'inline-block select-none border-[3px] [border-color:currentColor] px-3 py-1 font-prensa font-extrabold uppercase leading-none tracking-[0.08em] mix-blend-multiply dark:mix-blend-normal outline outline-1 outline-offset-[3px] [outline-color:currentColor]',
        TONOS[tono],
        !nitido && '[filter:url(#tinta-sello)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Filtro SVG de tinta: borde irregular y entintado desparejo. Se monta una vez por página. */
export function FiltroTintaSello() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <filter id="tinta-sello" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="4"
            result="ruido"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="ruido"
            scale="1.3"
            xChannelSelector="R"
            yChannelSelector="G"
            result="borde"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.06"
            numOctaves="3"
            seed="9"
            result="manchas"
          />
          <feColorMatrix
            in="manchas"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.6"
            result="mascara"
          />
          <feComposite in="borde" in2="mascara" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
