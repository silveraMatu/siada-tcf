import { AlertCircle, Building2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { useOrganismos } from '../hooks/useOrganismos';
import { CrearOrganismoDialog } from './CrearOrganismoDialog';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

export function OrganismosPage() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useOrganismos();

  const organismos = data
    ? [...data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Gestión de Organismos"
          description="Consulte los organismos auditados y registre nuevos."
        />
        <CrearOrganismoDialog />
      </div>

      {isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        >
          <p className="flex items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {getErrorMessage(error)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            Reintentar
          </Button>
        </div>
      )}

      {data && organismos.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Aún no hay organismos registrados</p>
            <p className="text-sm text-muted-foreground">
              Registre el primero con el botón «Nuevo Organismo».
            </p>
          </div>
        </div>
      )}

      {organismos.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {organismos.length === 1
              ? '1 organismo'
              : `${organismos.length} organismos`}
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rubro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organismos.map((organismo) => (
                  <TableRow key={organismo.id}>
                    <TableCell className="font-medium">
                      {organismo.nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {organismo.rubro}
                    </TableCell>
                    <TableCell>
                      {organismo.active ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full border-slate-200 bg-slate-100 font-medium text-slate-600"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {formatoFecha.format(new Date(organismo.fechaCreacion))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
