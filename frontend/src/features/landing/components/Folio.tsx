import { Sello } from './Sello';

/**
 * Foliador: numera cada foja con el mismo sello violeta. Es texto corto y pequeño,
 * así que va nítido; en tema oscuro se estampa lleno, con la tinta en reserva.
 */
export function Folio({ numero }: { numero: number }) {
  return (
    <Sello
      tono="violeta"
      nitido
      className="-rotate-3 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[13px] tracking-[0.06em] dark:bg-violet-300 dark:text-zinc-950"
    >
      Fs. {numero}
    </Sello>
  );
}
