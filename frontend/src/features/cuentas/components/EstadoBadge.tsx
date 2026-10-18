import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ESTADOS } from '../constants';
import type { CuentaMensual } from '../types';

export function EstadoBadge({ estado }: { estado: CuentaMensual['estado'] }) {
  const config = ESTADOS[estado as keyof typeof ESTADOS];

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full font-medium',
        config?.className ??
          'border-inactivo-border bg-inactivo-subtle text-inactivo',
      )}
    >
      {config?.label ?? estado}
    </Badge>
  );
}
