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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIngestarLibroBanco } from '../hooks/useIngestarLibroBanco';
import {
  LibroBancoParseError,
  parseLibroBanco,
} from '../lib/parse-libro-banco';
import { leerLibroDuplicado } from '../lib/libro-duplicado';
import type { LibroExistente, ResultadoParseo } from '../types';
import { DropZone } from './DropZone';
import { PreviewTable } from './PreviewTable';
import { ReemplazarLibroDialog } from './ReemplazarLibroDialog';

const MAX_BYTES = 5 * 1024 * 1024;

interface IngestaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaMensualId: number;
  /** Se invoca tras un envío exitoso, para que la vista refresque el estado. */
  onIngestada: () => void;
}

export function IngestaDialog({
  open,
  onOpenChange,
  cuentaMensualId,
  onIngestada,
}: IngestaDialogProps) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoParseo | null>(null);
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [duplicado, setDuplicado] = useState<LibroExistente | null>(null);

  const ingestar = useIngestarLibroBanco(cuentaMensualId);

  function limpiarArchivo() {
    setResultado(null);
    setNombreArchivo('');
    setNumeroCuenta('');
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
      const parseado = parseLibroBanco(await archivo.arrayBuffer());
      setNombreArchivo(archivo.name);
      setResultado(parseado);
      setNumeroCuenta(parseado.numeroCuentaCte ?? '');
    } catch (e) {
      setError(
        e instanceof LibroBancoParseError
          ? e.message
          : 'No se pudo procesar el archivo.',
      );
    } finally {
      setLeyendo(false);
    }
  }

  const invalidas = resultado?.filas.filter((f) => f.errores.length > 0) ?? [];
  // El N° de cuenta identifica el libro dentro de la rendición: sin él no se puede enviar.
  const sinNumeroCuenta = numeroCuenta.trim() === '';
  const puedeEnviar =
    resultado !== null &&
    invalidas.length === 0 &&
    !sinNumeroCuenta &&
    !ingestar.isPending;

  function enviar(reemplazar = false) {
    if (!resultado || !puedeEnviar) return;
    ingestar.mutate(
      {
        numeroCuentaCte: numeroCuenta.trim(),
        ...(reemplazar ? { reemplazar: true } : {}),
        transacciones: resultado.filas.map((f) => f.transaccion),
      },
      {
        onSuccess: () => {
          toast.success(
            reemplazar
              ? `Libro reemplazado: ${resultado.filas.length} transacciones cargadas.`
              : `Libro Banco enviado: ${resultado.filas.length} transacciones cargadas.`,
          );
          setDuplicado(null);
          cerrar();
          onIngestada();
        },
        // Ya hay un libro con ese N°: se le ofrece reemplazarlo o rechazar; cualquier otro error ya mostró su aviso.
        onError: (e) => setDuplicado(leerLibroDuplicado(e)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-6 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cargar Libro Banco</DialogTitle>
          <DialogDescription>
            Suba el Excel o CSV de una cuenta corriente y revise los datos antes
            de confirmar.
          </DialogDescription>
        </DialogHeader>

        {!resultado && <DropZone onArchivo={leerArchivo} cargando={leyendo} />}

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
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 text-muted-foreground" />
                <span className="font-medium">{nombreArchivo}</span>
                <span className="text-muted-foreground">
                  · {resultado.filas.length} filas
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
              <div className="space-y-1.5">
                <Label htmlFor="numero-cuenta" className="text-xs">
                  N° de Cta. Cte. *
                </Label>
                <Input
                  id="numero-cuenta"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="Ingrese el N° de cuenta"
                  required
                  aria-invalid={sinNumeroCuenta}
                  aria-describedby="numero-cuenta-ayuda"
                  className="h-8 w-56"
                />
                <p
                  id="numero-cuenta-ayuda"
                  className={
                    sinNumeroCuenta
                      ? 'text-xs text-danger'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {sinNumeroCuenta
                    ? 'Complete el N° de cuenta corriente para poder enviar.'
                    : 'Un solo libro por cuenta corriente en cada rendición.'}
                </p>
              </div>
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

            <PreviewTable filas={resultado.filas} />
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
            Confirmar y subir
          </Button>
        </DialogFooter>
      </DialogContent>

      <ReemplazarLibroDialog
        libro={duplicado}
        enviando={ingestar.isPending}
        onReemplazar={() => enviar(true)}
        onCancelar={() => setDuplicado(null)}
      />
    </Dialog>
  );
}
