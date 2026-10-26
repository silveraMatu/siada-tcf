import { AlertCircle, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropZone } from '@/features/libro-banco/components/DropZone';
import { ReemplazarLibroDialog } from '@/features/libro-banco/components/ReemplazarLibroDialog';
import { leerLibroDuplicado } from '@/features/libro-banco/lib/libro-duplicado';
import type { LibroExistente } from '@/features/libro-banco/types';
import { useIngestarIngresosEgresos } from '../hooks/useIngestarIngresosEgresos';
import {
  IngresosEgresosParseError,
  parseIngresosEgresosExcel,
} from '../lib/parse-ingresos-egresos';
import type { ResultadoParseoIngresosEgresos } from '../types';
import { PreviewIngresosEgresosTable } from './PreviewIngresosEgresosTable';

const MAX_BYTES = 5 * 1024 * 1024;

const AVISO_REEMPLAZO =
  'Cada rendición admite un solo libro de Ingresos y Egresos. Si lo reemplaza, el libro cargado se elimina y se guarda el del archivo nuevo. Si cancela, no se guarda nada y se conserva el actual.';

interface IngestarIngresosEgresosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaMensualId: number;
  /** Se invoca tras un envío exitoso, para que la vista refresque el estado. */
  onIngestada: () => void;
}

export function IngestarIngresosEgresosDialog({
  open,
  onOpenChange,
  cuentaMensualId,
  onIngestada,
}: IngestarIngresosEgresosDialogProps) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [resultado, setResultado] =
    useState<ResultadoParseoIngresosEgresos | null>(null);
  const [duplicado, setDuplicado] = useState<LibroExistente | null>(null);

  const ingestar = useIngestarIngresosEgresos(cuentaMensualId);

  function limpiarArchivo() {
    setResultado(null);
    setNombreArchivo('');
    setError(null);
    setDuplicado(null);
  }

  function cerrar() {
    limpiarArchivo();
    ingestar.reset();
    onOpenChange(false);
  }

  function cambiarApertura(abierto: boolean) {
    // Mientras se envía no se puede cerrar: evita perder el resultado de la operación.
    if (ingestar.isPending) return;
    if (abierto) onOpenChange(true);
    else cerrar();
  }

  async function leerArchivo(archivo: File) {
    limpiarArchivo();

    if (!/\.(xlsx|csv)$/i.test(archivo.name)) {
      setError('Formato no admitido. Suba un archivo .xlsx o .csv.');
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError('El archivo supera el máximo de 5 MB.');
      return;
    }

    setLeyendo(true);
    try {
      setResultado(await parseIngresosEgresosExcel(archivo));
      setNombreArchivo(archivo.name);
    } catch (e) {
      setError(
        e instanceof IngresosEgresosParseError
          ? e.message
          : 'No se pudo procesar el archivo.',
      );
    } finally {
      setLeyendo(false);
    }
  }

  const invalidas = resultado?.filas.filter((f) => f.errores.length > 0) ?? [];
  const puedeEnviar =
    resultado !== null && invalidas.length === 0 && !ingestar.isPending;

  function enviar(reemplazar = false) {
    if (!resultado || !puedeEnviar) return;
    ingestar.mutate(
      {
        ...(reemplazar ? { reemplazar: true } : {}),
        transacciones: resultado.filas.map((f) => f.transaccion),
      },
      {
        onSuccess: () => {
          toast.success(
            reemplazar
              ? `Libro reemplazado: ${resultado.filas.length} filas cargadas.`
              : `Ingresos y Egresos enviado: ${resultado.filas.length} filas cargadas.`,
          );
          setDuplicado(null);
          cerrar();
          onIngestada();
        },
        // Ya hay un libro en la rendición: se le ofrece reemplazarlo o rechazar; cualquier otro error ya mostró su aviso.
        onError: (e) => setDuplicado(leerLibroDuplicado(e)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-6 overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Cargar Ingresos y Egresos</DialogTitle>
          <DialogDescription>
            Suba el archivo del libro de Ingresos y Egresos y revise los datos
            antes de enviarlos. Las 3 primeras filas se toman como encabezado.
          </DialogDescription>
        </DialogHeader>

        {!resultado && (
          <DropZone
            onArchivo={leerArchivo}
            cargando={leyendo}
            etiqueta="Zona para soltar el archivo de Ingresos y Egresos"
          />
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              <span className="font-medium">{nombreArchivo}</span>
              <span className="text-muted-foreground">
                · {resultado.filas.length}{' '}
                {resultado.filas.length === 1 ? 'fila' : 'filas'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Quitar archivo"
                onClick={limpiarArchivo}
                disabled={ingestar.isPending}
              >
                <X />
              </Button>
            </div>

            {invalidas.length > 0 && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {invalidas.length === 1
                  ? '1 fila tiene errores.'
                  : `${invalidas.length} filas tienen errores.`}{' '}
                Corrija el archivo y vuelva a cargarlo para poder enviarlo.
              </p>
            )}

            <PreviewIngresosEgresosTable filas={resultado.filas} />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => cambiarApertura(false)}
            disabled={ingestar.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => enviar()} disabled={!puedeEnviar}>
            {ingestar.isPending && <Loader2 className="animate-spin" />}
            Confirmar y Subir
          </Button>
        </DialogFooter>
      </DialogContent>

      <ReemplazarLibroDialog
        libro={duplicado}
        enviando={ingestar.isPending}
        onReemplazar={() => enviar(true)}
        onCancelar={() => setDuplicado(null)}
        titulo="Ya hay un libro de Ingresos y Egresos en esta rendición"
        descripcion={AVISO_REEMPLAZO}
      />
    </Dialog>
  );
}
