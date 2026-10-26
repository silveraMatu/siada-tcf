import type { Rol } from '../../../usuarios/domain/enums/rol.enum.js';

//usuario que la estrategia JWT deja en request.user, con los roles actuales de la base
export interface UsuarioAutenticado {
  id: number;
  email: string;
  //para la instantánea del actor en la bitácora
  nombre: string;
  apellido: string;
  dni: string;
  roles: Rol[];
}
