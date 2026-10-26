import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

const DURACION_AVISO_MS = 2000;

/** «9f2c1a…3b7e»: el comienzo y el final alcanzan para reconocerla de un vistazo. */
export function abreviarHuella(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

/**
 * La huella SHA-256 del documento tal como se recibió: sirve para comprobar que no se modificó. Se muestra
 * abreviada y se copia completa.
 */
export function HuellaDocumento({ hash }: { hash: string }) {
  const [copiada, setCopiada] = useState(false);

  useEffect(() => {
    if (!copiada) return;
    const temporizador = setTimeout(() => setCopiada(false), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [copiada]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiada(true);
    } catch {
      toast.error(
        'No se pudo copiar la huella. Selecciónela y cópiela a mano.',
      );
    }
  }

  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
      <span>Huella SHA-256</span>
      <code className="font-mono text-foreground" title={hash}>
        {abreviarHuella(hash)}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label="Copiar la huella completa del documento"
        onClick={() => void copiar()}
      >
        {copiada ? <Check className="text-success" /> : <Copy />}
      </Button>
      <span role="status" className="sr-only">
        {copiada ? 'Huella copiada' : ''}
      </span>
    </p>
  );
}
