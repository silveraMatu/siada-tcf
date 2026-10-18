import { FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

import { cn } from '@/lib/utils';

interface DropZoneProps {
  onArchivo: (archivo: File) => void;
  cargando?: boolean;
}

export function DropZone({ onArchivo, cargando = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files[0];
    if (archivo) onArchivo(archivo);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Zona para soltar el archivo del Libro Banco"
      onClick={() => !cargando && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={soltar}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        arrastrando
          ? 'border-info bg-info-subtle'
          : 'border-input bg-muted/50 hover:border-muted-foreground/50 hover:bg-muted',
        cargando && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground">
        {cargando ? (
          <Loader2 className="size-5 animate-spin" />
        ) : arrastrando ? (
          <FileSpreadsheet className="size-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <UploadCloud className="size-5" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {cargando
            ? 'Leyendo archivo…'
            : 'Arrastre el archivo aquí o haga clic para seleccionarlo'}
        </p>
        <p className="text-xs text-muted-foreground">
          Formatos admitidos: .xlsx y .csv (hasta 5 MB)
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onArchivo(archivo);
          // Permite volver a elegir el mismo archivo.
          e.target.value = '';
        }}
      />
    </div>
  );
}
