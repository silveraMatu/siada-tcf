import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Collapsible = CollapsiblePrimitive.Root;

/**
 * Botón que abre y cierra el contenido. Lleva el chevron a la izquierda (gira al abrir) y, con
 * `cubreEncabezado`, estira su área clicable a todo el encabezado `relative` que lo contiene
 * (los controles que deban seguir siendo clicables, como un botón de acción, van con `relative z-10`).
 */
const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<
    typeof CollapsiblePrimitive.CollapsibleTrigger
  > & {
    cubreEncabezado?: boolean;
  }
>(({ className, children, cubreEncabezado = false, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleTrigger
    ref={ref}
    className={cn(
      'group flex items-center gap-2 text-left outline-none',
      cubreEncabezado &&
        'after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring',
      !cubreEncabezado &&
        'rounded-sm focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  >
    <ChevronRight
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90 motion-reduce:transition-none"
    />
    {children}
  </CollapsiblePrimitive.CollapsibleTrigger>
));
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      'overflow-hidden data-[state=closed]:motion-safe:animate-colapsable-cerrar data-[state=open]:motion-safe:animate-colapsable-abrir',
      className,
    )}
    {...props}
  />
));
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
