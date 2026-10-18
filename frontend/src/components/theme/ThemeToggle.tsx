import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

/** Un solo botón para alternar entre tema claro y oscuro; la primera visita sigue al sistema. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // El tema real solo se conoce en el cliente: evita una etiqueta incorrecta al hidratar.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const oscuro = montado && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
      onClick={() => setTheme(oscuro ? 'light' : 'dark')}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {oscuro ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
