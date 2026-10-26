import { Building2, UserMinus, UserPlus, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { useQuitarAuditor } from '../hooks/useAsignarAuditor';
import { useAuditores } from '../hooks/useAuditores';
import { useOrganismos } from '../hooks/useOrganismos';
import type { Organismo } from '../types';
import { AsignarAuditorDialog } from './AsignarAuditorDialog';

/** Qué auditor tiene cada organismo, para que el juez de trámite lo asigne, lo cambie o lo quite. */
export function AsignacionAuditoresPage() {
  const organismos = useOrganismos();
  const auditores = useAuditores();
  const quitar = useQuitarAuditor();
  const esAdmin = useAuthStore((s) => s.user?.roles.includes('ADMIN') ?? false);
  const [paraAsignar, setParaAsignar] = useState<Organismo | null>(null);
  const [paraQuitar, setParaQuitar] = useState<Organismo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloSinAuditor, setSoloSinAuditor] = useState(false);

  const lista = organismos.data
    ? [...organismos.data].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es'),
      )
    : [];
  const sinAuditor = lista.filter((o) => o.active && !o.auditor).length;
  // se compara sin tildes ni mayúsculas, así «hospital» encuentra «Hospital Central»
  const normalizar = (texto: string) =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const visibles = lista.filter(
    (o) =>
      (!soloSinAuditor || (o.active && !o.auditor)) &&
      (consulta === '' ||
        normalizar(`${o.nombre} ${o.rubro}`).includes(consulta)),
  );
  const sinCandidatos = auditores.data?.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Asignación de auditores"
        description="Cada organismo tiene un auditor a la vez, que es quien ve y audita sus rendiciones."
      />

      {sinCandidatos && (
        <Alert variant="info">
          <UserRoundCog aria-hidden />
          <AlertDescription>
            No hay usuarios activos con el rol Auditor, así que no se puede
            asignar a nadie.{' '}
            {esAdmin ? (
              <Link to="/admin/usuarios" className="font-medium underline">
                Asigne el rol desde Solicitudes de acceso
              </Link>
            ) : (
              'Pídale a un administrador que habilite a un auditor.'
            )}
            .
          </AlertDescription>
        </Alert>
      )}

      {organismos.isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {organismos.isError && (
        <ErrorAlert
          error={organismos.error}
          onRetry={() => void organismos.refetch()}
          retrying={organismos.isFetching}
        />
      )}

      {organismos.data && lista.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Aún no hay organismos registrados"
          description="Un administrador debe registrar el primero para poder asignarle un auditor."
        />
      )}

      {lista.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5 sm:w-80">
              <Label htmlFor="buscar-organismo">Buscar organismo</Label>
              <Input
                id="buscar-organismo"
                type="search"
                placeholder="Nombre o rubro"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Button
              variant={soloSinAuditor ? 'default' : 'outline'}
              size="sm"
              aria-pressed={soloSinAuditor}
              onClick={() => setSoloSinAuditor((activo) => !activo)}
            >
              Solo sin auditor
            </Button>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {visibles.length === lista.length
              ? lista.length === 1
                ? '1 organismo'
                : `${lista.length} organismos`
              : `${visibles.length} de ${lista.length} organismos`}
            {sinAuditor > 0 && (
              <>
                {' · '}
                <span className="font-medium text-warning">
                  {sinAuditor === 1
                    ? '1 activo sin auditor'
                    : `${sinAuditor} activos sin auditor`}
                </span>
              </>
            )}
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organismo</TableHead>
                  <TableHead>Rubro</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((organismo) => (
                  <TableRow key={organismo.id}>
                    <TableCell className="max-w-md whitespace-normal break-words font-medium">
                      {organismo.nombre}
                      {!organismo.active && (
                        <Badge
                          variant="outline"
                          className="ml-2 rounded-full border-transparent bg-inactivo-subtle font-medium text-inactivo"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal break-words text-muted-foreground">
                      {organismo.rubro}
                    </TableCell>
                    <TableCell>
                      {organismo.auditor ? (
                        `${organismo.auditor.apellido}, ${organismo.auditor.nombre}`
                      ) : (
                        <span className="text-muted-foreground">
                          Sin auditor
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={organismo.auditor ? 'outline' : 'default'}
                          size="sm"
                          disabled={!organismo.active}
                          title={
                            organismo.active
                              ? undefined
                              : 'Un organismo inactivo no admite auditor'
                          }
                          aria-label={`${organismo.auditor ? 'Cambiar' : 'Asignar'} el auditor de ${organismo.nombre}`}
                          onClick={() => setParaAsignar(organismo)}
                        >
                          <UserPlus />
                          {organismo.auditor ? 'Cambiar' : 'Asignar'}
                        </Button>
                        {organismo.auditor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Quitar el auditor de ${organismo.nombre}`}
                            onClick={() => setParaQuitar(organismo)}
                          >
                            <UserMinus />
                            Quitar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {visibles.length === 0 && (
            <EmptyState
              icon={Building2}
              title="Ningún organismo coincide"
              description="Pruebe con otro nombre o quite el filtro «Solo sin auditor»."
            />
          )}
        </section>
      )}

      <AsignarAuditorDialog
        organismo={paraAsignar}
        onCerrar={() => setParaAsignar(null)}
      />

      <AlertDialog
        open={paraQuitar !== null}
        onOpenChange={(abierto) =>
          !abierto && !quitar.isPending && setParaQuitar(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el auditor?</AlertDialogTitle>
            <AlertDialogDescription>
              {paraQuitar?.auditor?.nombre} {paraQuitar?.auditor?.apellido}{' '}
              dejará de ver y de poder auditar las rendiciones de «
              {paraQuitar?.nombre}». Después se puede asignar a otro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quitar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={quitar.isPending}
              onClick={(evento) => {
                // Radix cerraría el aviso al instante: se cierra recién cuando el servidor responde.
                evento.preventDefault();
                if (paraQuitar) {
                  quitar.mutate(paraQuitar.id, {
                    onSettled: () => setParaQuitar(null),
                  });
                }
              }}
            >
              Quitar auditor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
