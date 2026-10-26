import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import type { FiltrosActividad, PaginaActividad } from '../types';

/** Solo SUPERVISOR. De la más nueva a la más vieja; `cursor` es el `siguienteCursor` de la página anterior. */
export async function listarActividad(
  filtros: FiltrosActividad,
  cursor?: number,
  limite = 50,
): Promise<PaginaActividad> {
  const { data } = await api.get<PaginaActividad>('/actividad', {
    params: { ...filtros, limite, ...(cursor === undefined ? {} : { cursor }) },
  });
  return data;
}

/**
 * CSV con los mismos filtros (hasta 50.000 filas). Exige el header Authorization, por eso se baja con
 * axios como blob y no con un enlace. La exportación queda registrada en la bitácora.
 */
export async function exportarActividad(
  filtros: FiltrosActividad,
): Promise<Blob> {
  try {
    const { data } = await api.get<Blob>('/actividad/exportar', {
      params: filtros,
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    // con responseType blob el cuerpo del error también llega como blob: se lo vuelve a leer para mostrar su mensaje
    if (isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // no era JSON: queda el error de red genérico
      }
    }
    throw error;
  }
}
