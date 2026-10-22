import type { ResumenLibro } from '@/features/cuentas/types';
import {
  describirRangoFechas,
  describirTransacciones,
  etiquetaDeTipo,
  nombreDeLibro,
} from '../lib/formato-libro';

interface ResumenLibroFilaProps {
  libro: ResumenLibro;
  /** Se invoca al clicar el nombre del libro: abre la pestaña con sus filas y columnas. */
  onAbrir: () => void;
}

/** Una fila por libro cargado: qué libro es y qué trae, sin abrirlo. Su nombre abre el detalle. */
export function ResumenLibroFila({ libro, onAbrir }: ResumenLibroFilaProps) {
  const esBanco = libro.tipo === 'LIBRO_BANCO';

  return (
    <li className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {/* el nombre del libro banco es su N° de cuenta; los otros libros se nombran por su tipo */}
        {esBanco && (
          <p className="text-xs font-medium text-muted-foreground">
            {etiquetaDeTipo(libro.tipo)}
          </p>
        )}
        <button
          type="button"
          onClick={onAbrir}
          title="Ver las transacciones de este libro"
          className="rounded-sm text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {nombreDeLibro(libro)}
        </button>
      </div>
      <p className="text-muted-foreground">
        {describirTransacciones(libro.cantidadTransacciones)} ·{' '}
        {describirRangoFechas(libro.fechaDesde, libro.fechaHasta)}
      </p>
    </li>
  );
}
