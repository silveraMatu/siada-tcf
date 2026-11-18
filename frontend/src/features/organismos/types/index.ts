import { z } from 'zod';

/** Quién audita un organismo. */
export interface AuditorAsignado {
  id: number;
  nombre: string;
  apellido: string;
}

/** Usuario activo con rol AUDITOR que se puede asignar a un organismo. */
export interface Auditor extends AuditorAsignado {
  email: string;
}

export interface Organismo {
  id: number;
  nombre: string;
  rubro: string;
  active: boolean;
  fechaCreacion: string;
  /**
   * Solo lo traen `GET /organismos` y las asignaciones (juez de trámite y administrador); el organismo
   * del propio responsable no. null = sin auditor.
   */
  auditorId?: number | null;
  auditor?: AuditorAsignado | null;
}

/**
 * Catálogo cerrado de rubros: espeja `Rubro` del backend (los códigos son los que guarda la base y los que
 * usa el asistente de IA para elegir su contexto). La etiqueta es lo que ve la persona.
 */
export const RUBROS = [
  {
    valor: 'COMUNICACION_SOCIAL',
    etiqueta: 'Comunicación Social (Ministerio Jefatura de Gabinete)',
  },
  { valor: 'COMUNIDAD', etiqueta: 'Comunidad (Ministerio de la Comunidad)' },
  {
    valor: 'CULTURA_EDUCACION',
    etiqueta: 'Cultura y Educación (Ministerio de Cultura y Educación)',
  },
  {
    valor: 'DESARROLLO_HUMANO',
    etiqueta: 'Desarrollo Humano (Ministerio de Desarrollo Humano)',
  },
  {
    valor: 'ECONOMIA_HACIENDA_FINANZAS',
    etiqueta:
      'Economía, Hacienda y Finanzas (Ministerio de Economía, Hacienda y Finanzas)',
  },
  {
    valor: 'GOBIERNO_JUSTICIA_SEGURIDAD_TRABAJO',
    etiqueta:
      'Gobierno, Justicia, Seguridad y Trabajo (Ministerio de Gobierno, Justicia, Seguridad y Trabajo)',
  },
  {
    valor: 'PLANIFICACION_OBRAS_SERVICIOS',
    etiqueta:
      'Planificación, Inversión, Obras y Servicios Públicos (Ministerio de Planificación, Inversión, Obras y Servicios Públicos)',
  },
  {
    valor: 'PRODUCCION_AMBIENTE',
    etiqueta: 'Producción y Ambiente (Ministerio de la Producción y Ambiente)',
  },
  { valor: 'TURISMO', etiqueta: 'Turismo (Ministerio de Turismo)' },
  {
    valor: 'OTROS',
    etiqueta: 'Otros (secretarías especializadas y demás organismos)',
  },
] as const;

export type RubroValor = (typeof RUBROS)[number]['valor'];

const VALORES_RUBRO = RUBROS.map((r) => r.valor) as [
  RubroValor,
  ...RubroValor[],
];

/** El nombre legible de un rubro; si el servidor manda uno que no se conoce, se muestra tal cual. */
export function etiquetaRubro(valor: string): string {
  return RUBROS.find((r) => r.valor === valor)?.etiqueta ?? valor;
}

/** Espeja las reglas de `POST /organismos`: nombre de hasta 255 caracteres y un rubro del catálogo. */
export const CrearOrganismoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(255, 'El nombre no puede superar los 255 caracteres'),
  rubro: z.enum(VALORES_RUBRO, { message: 'El rubro es obligatorio' }),
});

export type CrearOrganismoValues = z.infer<typeof CrearOrganismoSchema>;
