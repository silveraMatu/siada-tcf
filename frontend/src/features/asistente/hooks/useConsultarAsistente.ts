import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { consultarAsistente } from '../api/asistente.api';
import type {
  ConsultaAsistente,
  EventoAsistente,
  PasoRazonamiento,
} from '../types';

/** Agrega el paso o reemplaza al que tiene su mismo id (llega `en_curso` y después ya terminado). */
export function aplicarPaso(
  pasos: PasoRazonamiento[],
  paso: PasoRazonamiento,
): PasoRazonamiento[] {
  const indice = pasos.findIndex((p) => p.id === paso.id);
  if (indice === -1) return [...pasos, paso];
  return pasos.map((p, i) => (i === indice ? paso : p));
}

/**
 * Envía una pregunta al copiloto y va exponiendo los pasos a medida que llegan, para poder mostrarlos
 * en vivo. Sin toast: el error lo muestra el chat dentro del hilo, con la opción de reintentar.
 * `cancelar` aborta la consulta en curso, y desmontar el componente también.
 */
export function useConsultarAsistente() {
  const [pasosEnVivo, setPasosEnVivo] = useState<PasoRazonamiento[]>([]);
  const controlador = useRef<AbortController | null>(null);

  useEffect(() => () => controlador.current?.abort(), []);

  const mutacion = useMutation({
    mutationFn: (consulta: ConsultaAsistente) => {
      controlador.current?.abort();
      const actual = new AbortController();
      controlador.current = actual;
      setPasosEnVivo([]);
      return consultarAsistente(consulta, {
        signal: actual.signal,
        onEvento: (evento: EventoAsistente) => {
          if (evento.tipo === 'paso') {
            setPasosEnVivo((previos) => aplicarPaso(previos, evento.paso));
          }
        },
      });
    },
  });

  const cancelar = useCallback(() => controlador.current?.abort(), []);

  return { ...mutacion, pasosEnVivo, cancelar };
}
