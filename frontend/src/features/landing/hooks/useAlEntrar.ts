import { useEffect, useRef, useState } from 'react';

type Fase = 'estatica' | 'oculta' | 'animada';

/**
 * Dispara una entrada una sola vez al llegar a la vista. Sin IntersectionObserver
 * o con movimiento reducido el contenido queda en su estado final, visible.
 */
export function useAlEntrar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [fase, setFase] = useState<Fase>('estatica');

  useEffect(() => {
    const el = ref.current;
    const reducido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reducido || typeof IntersectionObserver === 'undefined') return;

    setFase('oculta');
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setFase('animada');
          observador.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return { ref, fase };
}
