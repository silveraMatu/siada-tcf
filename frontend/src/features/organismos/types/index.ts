import { z } from 'zod';

export interface Organismo {
  id: number;
  nombre: string;
  rubro: string;
  active: boolean;
  fechaCreacion: string;
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
