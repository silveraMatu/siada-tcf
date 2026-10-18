import { Sello } from './Sello';

/** Foliador: numera cada foja con el mismo sello violeta. */
export function Folio({ numero }: { numero: number }) {
  return (
    <Sello
      tono="violeta"
      className="-rotate-3 whitespace-nowrap rounded-sm px-2 py-1 text-xs"
    >
      Fs. {numero}
    </Sello>
  );
}
