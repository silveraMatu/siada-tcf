import { ChevronDown, Plus, RefreshCw, Upload } from 'lucide-react';
import { useState } from 'react';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PreviewIngresosEgresosTable } from '@/features/ingresos-egresos/components/PreviewIngresosEgresosTable';
import { guardadoAFilas } from '@/features/ingresos-egresos/lib/guardado-a-filas';
import { resumirIngresosEgresos } from '@/features/ingresos-egresos/lib/resumir-ingresos-egresos';
import type { IngresosEgresosGuardado } from '@/features/ingresos-egresos/types';
import { HuellaDocumento } from '@/features/libro-banco/components/HuellaDocumento';
import { LibrosDeRendicion } from '@/features/libro-banco/components/LibrosDeRendicion';
import {
  describirRangoFechas,
  formatearMomento,
} from '@/features/libro-banco/lib/formato-libro';
import { resumirLibro } from '@/features/libro-banco/lib/resumir-libro';
import { nombreCompleto } from '@/lib/persona';
import type { LibroBancoGuardado } from '@/features/libro-banco/types';
import { TOTAL_DOCUMENTOS } from '../lib/documentos-faltantes';
import { FilaDocumento } from './FilaDocumento';

/** El estado de una consulta, tal como lo necesita la fila: sin atarla a React Query. */
interface Consulta<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
}

interface DocumentosDeRendicionProps {
  cuentaMensualId: number;
  /** Solo en borrador se cargan documentos; presentada, la sección es de solo lectura. */
  enBorrador: boolean;
  librosBanco: Consulta<LibroBancoGuardado[]>;
  ingresosEgresos: Consulta<IngresosEgresosGuardado | null>;
  onCargarLibroBanco: () => void;
  onCargarIngresosEgresos: () => void;
}

function describirCuentas(cantidad: number): string {
  return cantidad === 1 ? '1 cuenta cargada' : `${cantidad} cuentas cargadas`;
}

/**
 * Los documentos que exige la rendición, en una sola lista: cuáles ya se cargaron, cuáles faltan y
 * la única acción de cada uno. El botón del documento que falta es el principal: es el siguiente paso.
 */
export function DocumentosDeRendicion({
  cuentaMensualId,
  enBorrador,
  librosBanco,
  ingresosEgresos,
  onCargarLibroBanco,
  onCargarIngresosEgresos,
}: DocumentosDeRendicionProps) {
  const [verFilas, setVerFilas] = useState(false);

  const cantidadBancos = librosBanco.data?.length ?? 0;
  const libroIE = ingresosEgresos.data ?? null;
  const listos = (cantidadBancos > 0 ? 1 : 0) + (libroIE !== null ? 1 : 0);
  const sinDatos = librosBanco.isPending || ingresosEgresos.isPending;
  const resumenIE = libroIE ? resumirIngresosEgresos(libroIE) : null;

  return (
    <section aria-labelledby="documentos-titulo" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="documentos-titulo" className="text-sm font-medium">
          Documentos de la rendición
        </h3>
        {!sinDatos && (
          <p
            role="status"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {listos} de {TOTAL_DOCUMENTOS} listos
          </p>
        )}
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        <FilaDocumento
          titulo="Libro Banco"
          descripcion="Un libro por cuenta corriente, en Excel o CSV."
          estado={
            cantidadBancos > 0 ? 'cargado' : enBorrador ? 'falta' : 'no-cargado'
          }
          etiquetaEstado={
            librosBanco.isPending
              ? 'Cargando…'
              : cantidadBancos > 0
                ? describirCuentas(cantidadBancos)
                : enBorrador
                  ? 'Falta'
                  : 'No se cargó'
          }
          accion={
            enBorrador &&
            !librosBanco.isPending &&
            !librosBanco.isError && (
              <Button
                variant={cantidadBancos === 0 ? 'default' : 'outline'}
                onClick={onCargarLibroBanco}
              >
                {cantidadBancos === 0 ? <Upload /> : <Plus />}
                {cantidadBancos === 0
                  ? 'Cargar libro banco'
                  : 'Agregar otra cuenta'}
              </Button>
            )
          }
        >
          {librosBanco.isPending && <Skeleton className="h-16 w-full" />}
          {librosBanco.isError && (
            <ErrorAlert
              error={librosBanco.error}
              onRetry={() => void librosBanco.refetch()}
              retrying={librosBanco.isFetching}
            />
          )}
          {librosBanco.data && cantidadBancos > 0 && (
            <LibrosDeRendicion
              cuentaMensualId={cuentaMensualId}
              libros={librosBanco.data.map(resumirLibro)}
              etiqueta="Libros banco cargados"
            />
          )}
        </FilaDocumento>

        <FilaDocumento
          titulo="Ingresos y Egresos"
          descripcion={
            resumenIE
              ? `${resumenIE.filas === 1 ? '1 fila' : `${resumenIE.filas} filas`} · ${describirRangoFechas(resumenIE.fechaDesde, resumenIE.fechaHasta)} · cargado el ${formatearMomento(resumenIE.cargadoEl)}${resumenIE.subidoPor ? ` por ${nombreCompleto(resumenIE.subidoPor)}` : ''}`
              : 'Un solo libro por rendición. Excel con 3 filas de encabezado.'
          }
          estado={libroIE ? 'cargado' : enBorrador ? 'falta' : 'no-cargado'}
          etiquetaEstado={
            ingresosEgresos.isPending
              ? 'Cargando…'
              : libroIE
                ? 'Cargado'
                : enBorrador
                  ? 'Falta'
                  : 'No se cargó'
          }
          accion={
            enBorrador &&
            !ingresosEgresos.isPending &&
            !ingresosEgresos.isError && (
              <Button
                variant={libroIE ? 'outline' : 'default'}
                onClick={onCargarIngresosEgresos}
              >
                {libroIE ? <RefreshCw /> : <Upload />}
                {libroIE ? 'Reemplazar' : 'Cargar ingresos y egresos'}
              </Button>
            )
          }
        >
          {ingresosEgresos.isError && (
            <ErrorAlert
              error={ingresosEgresos.error}
              onRetry={() => void ingresosEgresos.refetch()}
              retrying={ingresosEgresos.isFetching}
            />
          )}
          {libroIE && (
            <div className="space-y-3">
              <HuellaDocumento hash={libroIE.hashContenido} />
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={verFilas}
                aria-controls="filas-ingresos-egresos"
                onClick={() => setVerFilas((abierto) => !abierto)}
                className="-ml-2.5"
              >
                <ChevronDown
                  className={
                    verFilas
                      ? 'rotate-180 motion-safe:transition-transform'
                      : 'motion-safe:transition-transform'
                  }
                />
                {verFilas ? 'Ocultar filas' : 'Ver filas'}
              </Button>
              {verFilas && (
                <div id="filas-ingresos-egresos">
                  <PreviewIngresosEgresosTable
                    filas={guardadoAFilas(libroIE)}
                    className="max-h-[420px]"
                  />
                </div>
              )}
            </div>
          )}
        </FilaDocumento>
      </ul>
    </section>
  );
}
