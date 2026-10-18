import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Organismo } from '@/features/organismos/types';
import { useAsignarOrganismo } from '../hooks/useAsignarOrganismo';
import type { Responsable } from '../types';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

interface ResponsablePendienteCardProps {
  responsable: Responsable;
  /** Organismos activos que se pueden asignar. */
  organismos: Organismo[];
  cargandoOrganismos?: boolean;
}

export function ResponsablePendienteCard({
  responsable,
  organismos,
  cargandoOrganismos = false,
}: ResponsablePendienteCardProps) {
  const [organismoId, setOrganismoId] = useState('');
  const asignar = useAsignarOrganismo();

  const { usuario } = responsable;
  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
  const sinOrganismos = !cargandoOrganismos && organismos.length === 0;

  function onAsignar() {
    const organismo = organismos.find((o) => o.id === Number(organismoId));
    if (!organismo) return;
    asignar.mutate({
      responsableId: responsable.id,
      organismoId: organismo.id,
      nombre: nombreCompleto,
      organismoNombre: organismo.nombre,
    });
  }

  return (
    <li>
      <Card className="flex flex-col gap-6 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{nombreCompleto}</p>
          <p className="truncate text-sm text-muted-foreground">
            {usuario.email}
          </p>
          <p className="text-sm text-muted-foreground">
            Registrado el{' '}
            {formatoFecha.format(new Date(responsable.fechaCreacion))}
            {!responsable.active && ' · Responsable inactivo'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select
            value={organismoId}
            onValueChange={setOrganismoId}
            disabled={cargandoOrganismos || sinOrganismos || asignar.isPending}
          >
            <SelectTrigger
              className="w-full sm:min-w-60"
              aria-label={`Organismo para ${nombreCompleto}`}
            >
              <SelectValue
                placeholder={
                  cargandoOrganismos
                    ? 'Cargando organismos…'
                    : sinOrganismos
                      ? 'Sin organismos activos'
                      : 'Seleccione un organismo'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {organismos.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={
              organismoId === '' || asignar.isPending || !responsable.active
            }
            onClick={onAsignar}
          >
            {asignar.isPending && <Loader2 className="animate-spin" />}
            Asignar
          </Button>
        </div>
      </Card>
    </li>
  );
}
