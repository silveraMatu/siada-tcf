import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { alternarRol, ROL_LABEL, ROLES, type Rol } from '../types';

interface RolesSelectorProps {
  value: Rol[];
  onChange: (roles: Rol[]) => void;
  disabled?: boolean;
}

/** Los roles como tags que se activan y desactivan (toggle). */
export function RolesSelector({
  value,
  onChange,
  disabled,
}: RolesSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Roles">
      {ROLES.map((rol) => {
        const seleccionado = value.includes(rol);
        const alternar = () => !disabled && onChange(alternarRol(value, rol));
        return (
          <Badge
            key={rol}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={seleccionado}
            aria-disabled={disabled || undefined}
            variant={seleccionado ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer select-none px-3 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              !seleccionado && 'text-muted-foreground hover:bg-accent',
              disabled && 'pointer-events-none opacity-50',
            )}
            onClick={alternar}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                alternar();
              }
            }}
          >
            {ROL_LABEL[rol]}
          </Badge>
        );
      })}
    </div>
  );
}
