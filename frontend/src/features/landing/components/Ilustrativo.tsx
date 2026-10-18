import { cn } from '@/lib/utils';

/** Rótulo obligatorio de todo material de demostración con datos ficticios. */
export function Ilustrativo({ className }: { className?: string }) {
  return (
    <p className={cn('font-maquina text-xs', className)}>
      Ejemplo ilustrativo · datos ficticios
    </p>
  );
}
