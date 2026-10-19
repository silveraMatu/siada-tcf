import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMiOrganismo } from '@/features/responsables/hooks/useMiOrganismo';
import { getErrorMessage } from '@/lib/api';
import { EJERCICIOS_FISCALES, MESES } from '../constants';
import { useResolverCuentaMensual } from '../hooks/useResolverCuentaMensual';
import type { ContextoCuenta, CuentaMensual } from '../types';

interface ContextoFormProps {
  onResuelta: (cuenta: CuentaMensual, contexto: ContextoCuenta) => void;
  /** Se invoca cuando el usuario cambia un selector: la cuenta resuelta deja de ser válida. */
  onCambio: () => void;
}

export function ContextoForm({ onResuelta, onCambio }: ContextoFormProps) {
  const organismo = useMiOrganismo();
  const resolver = useResolverCuentaMensual();

  const [ejercicio, setEjercicio] = useState('');
  const [mes, setMes] = useState('');

  const completo = organismo.isSuccess && ejercicio !== '' && mes !== '';

  function cambiar(setter: (valor: string) => void) {
    return (valor: string) => {
      setter(valor);
      onCambio();
    };
  }

  function confirmar() {
    if (!completo) return;

    const contexto: ContextoCuenta = {
      organismoId: organismo.data.id,
      organismoNombre: organismo.data.nombre,
      ejercicioFiscal: Number(ejercicio),
      mes: Number(mes),
    };
    resolver.mutate(
      {
        organismoId: contexto.organismoId,
        ejercicioFiscal: contexto.ejercicioFiscal,
        mes: contexto.mes,
      },
      { onSuccess: (cuenta) => onResuelta(cuenta, contexto) },
    );
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label id="organismo-label">Organismo</Label>
          {organismo.isPending ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div
              aria-labelledby="organismo-label"
              className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm"
            >
              {organismo.data?.nombre ?? '—'}
            </div>
          )}
          {organismo.isError && (
            <p className="text-xs text-destructive">
              {getErrorMessage(organismo.error)}{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => organismo.refetch()}
              >
                Reintentar
              </button>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ejercicio">Ejercicio fiscal</Label>
          <Select value={ejercicio} onValueChange={cambiar(setEjercicio)}>
            <SelectTrigger id="ejercicio">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {EJERCICIOS_FISCALES.map((anio) => (
                <SelectItem key={anio} value={String(anio)}>
                  {anio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mes">Mes</Label>
          <Select value={mes} onValueChange={cambiar(setMes)}>
            <SelectTrigger id="mes">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nombre, i) => (
                <SelectItem key={nombre} value={String(i + 1)}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={confirmar} disabled={!completo || resolver.isPending}>
          {resolver.isPending && <Loader2 className="animate-spin" />}
          Confirmar Contexto
        </Button>
      </div>
    </section>
  );
}
