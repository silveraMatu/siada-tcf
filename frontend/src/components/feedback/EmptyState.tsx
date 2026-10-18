import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Estado vacío de una lista: contenedor punteado, ícono tenue y texto breve. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
        <Icon
          className="size-6 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
