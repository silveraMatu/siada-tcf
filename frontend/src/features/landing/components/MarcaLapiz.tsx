import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

interface MarcaLapizProps {
  className?: string;
  style?: CSSProperties;
}

/** Tilde de lápiz del auditor; se traza al entrar (sin animación con movimiento reducido). */
export function MarcaLapiz({ className, style }: MarcaLapizProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0 text-sello-violeta', className)}
    >
      <path
        d="M2 9.2 5.8 13 14 2.6"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        className="motion-safe:animate-lapiz-in"
        style={style}
      />
    </svg>
  );
}
