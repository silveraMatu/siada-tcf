import {
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { formatearMomento } from '@/features/libro-banco/lib/formato-libro';
import type { LibroExistente } from '@/features/libro-banco/types';
import { useIngestarRai } from '../hooks/useIngestarRai';
import { parseRaiExcel, RaiParseError } from '../lib/parse-rai';
import type { ResumenRai } from '../lib/resumir-rai';
import type { ResultadoParseoRai } from '../types';
import { PreviewRaiTable } from './PreviewRaiTable';

const MAX_BYTES = 5 * 1024 * 1024;

const AVISO_REEMPLAZO =
  'Cada rendición admite un solo libro RAI. Si lo reemplaza, el libro cargado se elimina y se guarda el del archivo nuevo. Si cancela, no se guarda nada y se conserva el actual.';

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

interface IngestarRaiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaMensualId: number;
  /** Ejercicio de la rendición: la planilla trae día y mes en cada asiento, y el año sale de acá. */
  ejercicioFiscal: number;
  /** Se invoca tras un envío exitoso, para que la vista refresque el estado. */
  onIngestada: () => void;
  /** Libro ya cargado en la rendición: el diálogo pasa a ser un reemplazo y lo avisa de entrada. */
  libroExistente?: ResumenRai | null;
}

export function IngestarRaiDialog({
  open,
  onOpenChange,
  cuentaMensualId,
  ejercicioFiscal,
  onIngestada,
  libroExistente = null,
}: IngestarRaiDialogProps) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoParseoRai | null>(null);
  const [duplicado, setDuplicado] = useState<LibroExistente | null>(null);

  const ingestar = useIngestarRai(cuentaMensualId);

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
    // Mientras se envía no se puede cerrar: evita perder el resultado de la operaión.
    if (ingestar.isPending) return;
    if (abierto) onOpenChange(true);
    else cerrar();
  }

  async function leerArchivo(archivo: File) {
    limpiarArchivo();

    if (!/\.(xls|xlsx|csv)$/i.test(archivo.name)) {
      setError('Formato no admitido. Suba un archivo .xls, .xlsx o .csv.');
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError('El archivo supera el máximo de 5 MB.');
      return;
    }

    setLeyendo(true);
    try {
      setResultado(await parseRaiExcel(archivo, ejercicioFiscal));
      setNombreArchivo(archivo.name);
    } catch (e) {
      setError(
        e instanceof RaiParseError
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

  const reemplaza = libroExistente !== null;

  function enviar(confirmaReemplazo = false) {
    if (!resultado || !puedeEnviar) return;
    const reemplazar = reemplaza || confirmaReemplazo;
    ingestar.mutate(
      {
        ...(reemplazar ? { reemplazar: true } : {}),
        transacciones: resultado.filas.map((f) => f.transaccion),
      },
      {
        onSuccess: () => {
          toast.success(
            reemplazar
              ? `Libro reemplazado: ${plural(resultado.filas.length, 'asiento cargado', 'asientos cargados')}.`
              : `RAI enviado: ${plural(resultado.filas.length, 'asiento cargado', 'asientos cargados')}.`,
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
          <DialogTitle>
            {reemplaza ? 'Reemplazar el RAI' : 'Cargar el RAI'}
          </DialogTitle>
          <DialogDescription>
            Suba la planilla del Registro Analítico de Ingresos y revise los
            asientos antes de confirmar. Se lee la primera hoja del archivo y
            las fechas se arman con el día y el mes de la planilla y el
            ejercicio {ejercicioFiscal} de la rendición. No se envían los datos
            de la partida.
          </DialogDescription>
        </DialogHeader>

        {libroExistente && (
          <Alert variant="info">
            <AlertDescription>
              Ya hay un RAI cargado (
              {plural(libroExistente.asientos, 'asiento', 'asientos')}, el{' '}
              {formatearMomento(libroExistente.cargadoEl)}). Al confirmar se
              reemplaza por el del archivo nuevo.
            </AlertDescription>
          </Alert>
        )}

        {!resultado && (
          <DropZone
            onArchivo={leerArchivo}
            cargando={leyendo}
            etiqueta="Zona para soltar el archivo del RAI"
            accept=".xls,.xlsx,.csv"
            formatos=".xls, .xlsx y .csv"
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
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              <span className="font-medium">{nombreArchivo}</span>
              <span className="text-muted-foreground">
                · {plural(resultado.filas.length, 'asiento', 'asientos')}
                {resultado.omitidas > 0 &&
                  ` · ${plural(resultado.omitidas, 'fila omitida', 'filas omitidas')} (transporte o sin usar)`}
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

            {resultado.ejercicioDeLaPlanilla !== undefined &&
              resultado.ejercicioDeLaPlanilla !== ejercicioFiscal && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-subtle p-3 text-sm text-warning"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  La planilla indica el ejercicio{' '}
                  {resultado.ejercicioDeLaPlanilla} y esta rendición es del{' '}
                  {ejercicioFiscal}: las fechas se armaron con el{' '}
                  {ejercicioFiscal}. Verifique que sea la planilla correcta
                  antes de confirmar.
                </p>
              )}

            {invalidas.length > 0 && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {invalidas.length === 1
                  ? '1 asiento tiene errores.'
                  : `${invalidas.length} asientos tienen errores.`}{' '}
                Corrija el archivo y vuelva a cargarlo para poder enviarlo.
              </p>
            )}

            <PreviewRaiTable filas={resultado.filas} />
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
            {reemplaza ? 'Confirmar y reemplazar' : 'Confirmar y subir'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ReemplazarLibroDialog
        libro={duplicado}
        enviando={ingestar.isPending}
        onReemplazar={() => enviar(true)}
        onCancelar={() => setDuplicado(null)}
        titulo="Ya hay un RAI en esta rendición"
        descripcion={AVISO_REEMPLAZO}
      />
    </Dialog>
  );
}
