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

/** Espeja las reglas de `POST /organismos`: ambos campos obligatorios, hasta 255 caracteres. */
export const CrearOrganismoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(255, 'El nombre no puede superar los 255 caracteres'),
  rubro: z
    .string()
    .trim()
    .min(1, 'El rubro es obligatorio')
    .max(255, 'El rubro no puede superar los 255 caracteres'),
});

export type CrearOrganismoValues = z.infer<typeof CrearOrganismoSchema>;
