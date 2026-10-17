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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIngestarLibroBanco } from '../hooks/useIngestarLibroBanco';
import { LibroBancoParseError, parseLibroBanco } from '../lib/parse-libro-banco';
import type { ResultadoParseo } from '../types';
import { DropZone } from './DropZone';
import { PreviewTable } from './PreviewTable';

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
  const [tipo, setTipo] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoParseo | null>(null);
  const [numeroCuenta, setNumeroCuenta] = useState('');

  const ingestar = useIngestarLibroBanco(cuentaMensualId);

  function limpiarArchivo() {
    setResultado(null);
    setNombreArchivo('');
    setNumeroCuenta('');
    setError(null);
  }

  function cerrar() {
    limpiarArchivo();
    setTipo('');
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
  const puedeEnviar =
    resultado !== null && invalidas.length === 0 && !ingestar.isPending;

  function enviar() {
    if (!resultado || !puedeEnviar) return;
    ingestar.mutate(
      {
        ...(numeroCuenta.trim() ? { numeroCuentaCte: numeroCuenta.trim() } : {}),
        transacciones: resultado.filas.map((f) => f.transaccion),
      },
      {
        onSuccess: () => {
          toast.success(
            `Libro Banco enviado: ${resultado.filas.length} transacciones cargadas.`,
          );
          cerrar();
          onIngestada();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-6 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cargar documentos</DialogTitle>
          <DialogDescription>
            Seleccione el tipo de documento y suba el archivo para revisar los
            datos antes de enviarlos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="tipo-documento">Tipo de documento</Label>
          <Select
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor);
              limpiarArchivo();
            }}
          >
            <SelectTrigger id="tipo-documento" className="sm:w-72">
              <SelectValue placeholder="Seleccione un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="libro-banco">Libro Banco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tipo === 'libro-banco' && !resultado && (
          <DropZone onArchivo={leerArchivo} cargando={leyendo} />
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
                  N° de Cta. Cte.
                </Label>
                <Input
                  id="numero-cuenta"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="No detectado"
                  className="h-8 w-48"
                />
              </div>
            </div>

            {invalidas.length > 0 && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={enviar}
            disabled={!puedeEnviar}
          >
            {ingestar.isPending && <Loader2 className="animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
