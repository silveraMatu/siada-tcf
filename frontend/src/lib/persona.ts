/** Quién hizo algo, sin más datos personales que el nombre. */
export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

/** «Ana Pérez» */
export function nombreCompleto(
  persona: Pick<PersonaResumen, 'nombre' | 'apellido'>,
): string {
  return `${persona.nombre} ${persona.apellido}`;
}
