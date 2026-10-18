/** Datos del usuario que el backend anida en cada responsable (no incluye el DNI). */
export interface UsuarioResponsable {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Responsable {
  id: number;
  usuarioId: number;
  active: boolean;
  organismoId: number | null;
  fechaCreacion: string;
  usuario: UsuarioResponsable;
}
