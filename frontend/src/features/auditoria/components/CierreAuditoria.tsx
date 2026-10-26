import { Loader2, Lock } from 'lucide-react';
import { useState, type MouseEvent } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EstadoBadge } from '@/features/cuentas/components/EstadoBadge';
import { useCerrarAuditoria } from '../hooks/useCerrarAuditoria';
import type { Ejecucion } from '../types/auditoria.types';

const MAX_CONCLUSION = 5000;

const formatoMomento = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

interface CierreAuditoriaProps {
  cuentaMensualId: number;
  ejecucion: Ejecucion;
  /** La rendición está en auditoría y todavía no se cerró. */
  enCurso: boolean;
}

/**
 * Cierre de la auditoría: mientras está en curso, la conclusión del auditor y el botón para cerrarla (solo
 * con todos los hallazgos revisados); una vez cerrada, un resumen de solo lectura.
 */
export function CierreAuditoria({
  cuentaMensualId,
  ejecucion,
  enCurso,
}: CierreAuditoriaProps) {
  const [conclusion, setConclusion] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const cerrar = useCerrarAuditoria(cuentaMensualId);

  const { abiertas, confirmadas, descartadas } = ejecucion.observaciones;

  if (ejecucion.cerradaEn) {
    return (
      <section
        aria-labelledby="cierre-titulo"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
          <h2
            id="cierre-titulo"
            className="text-lg font-semibold tracking-tight"
          >
            Auditoría cerrada
          </h2>
          {ejecucion.estadoFinal && (
            <EstadoBadge estado={ejecucion.estadoFinal} />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Cerrada el {formatoMomento.format(new Date(ejecucion.cerradaEn))}
          {ejecucion.cerradaPor &&
            ` por ${ejecucion.cerradaPor.nombre} ${ejecucion.cerradaPor.apellido}`}
          .{' '}
          {plural(
            confirmadas,
            'observación confirmada',
            'observaciones confirmadas',
          )}{' '}
          y {plural(descartadas, 'descartada', 'descartadas')}.
        </p>
        {ejecucion.conclusion && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Conclusión</h3>
            <p className="whitespace-pre-wrap text-sm">
              {ejecucion.conclusion}
            </p>
          </div>
        )}
      </section>
    );
  }

  if (!enCurso) return null;

  const limpia = conclusion.trim();
  const sinRevisar = abiertas > 0;
  const resultado = confirmadas > 0 ? 'Con observaciones' : 'Auditada';

  function confirmar(evento: MouseEvent) {
    // Radix cerraría el aviso al instante: se cierra recién cuando el servidor responde.
    evento.preventDefault();
    cerrar.mutate(limpia, { onSettled: () => setConfirmando(false) });
  }

  return (
    <section
      aria-labelledby="cierre-titulo"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="space-y-1">
        <h2 id="cierre-titulo" className="text-lg font-semibold tracking-tight">
          Cierre de la auditoría
        </h2>
        <p className="text-sm text-muted-foreground">
          Revise cada hallazgo y cierre la auditoría con su conclusión. Después
          la rendición queda de solo lectura.
        </p>
      </div>

      <ul
        aria-label="Estado de la revisión"
        className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums"
      >
        <li>
          <span className="font-medium text-warning">{abiertas}</span>{' '}
          {abiertas === 1 ? 'abierta' : 'abiertas'}
        </li>
        <li>
          <span className="font-medium text-danger">{confirmadas}</span>{' '}
          {confirmadas === 1 ? 'confirmada' : 'confirmadas'}
        </li>
        <li>
          <span className="font-medium text-muted-foreground">
            {descartadas}
          </span>{' '}
          {descartadas === 1 ? 'descartada' : 'descartadas'}
        </li>
      </ul>

      <div className="space-y-2">
        <Label htmlFor="conclusion">Conclusión</Label>
        <Textarea
          id="conclusion"
          value={conclusion}
          maxLength={MAX_CONCLUSION}
          aria-describedby="conclusion-ayuda"
          placeholder="Resuma qué verificó y a qué conclusión llegó sobre esta rendición."
          onChange={(e) => setConclusion(e.target.value)}
        />
        <p
          id="conclusion-ayuda"
          className="text-xs tabular-nums text-muted-foreground"
        >
          {conclusion.length} de {MAX_CONCLUSION} caracteres
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <AlertDialog
          open={confirmando}
          onOpenChange={(valor) => !cerrar.isPending && setConfirmando(valor)}
        >
          <AlertDialogTrigger asChild>
            <Button disabled={sinRevisar || limpia === ''}>
              Cerrar auditoría
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar la auditoría?</AlertDialogTitle>
              <AlertDialogDescription>
                La rendición quedará <strong>{resultado}</strong> (
                {plural(
                  confirmadas,
                  'observación confirmada',
                  'observaciones confirmadas',
                )}
                ) y no se podrá volver a revisar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cerrar.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmar}
                disabled={cerrar.isPending}
              >
                {cerrar.isPending && <Loader2 className="animate-spin" />}
                Cerrar auditoría
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {(sinRevisar || limpia === '') && (
          <p className="text-xs text-muted-foreground">
            {sinRevisar
              ? `Quedan ${plural(abiertas, 'observación sin revisar', 'observaciones sin revisar')}.`
              : 'Escriba la conclusión para poder cerrar.'}
          </p>
        )}
      </div>
    </section>
  );
}
