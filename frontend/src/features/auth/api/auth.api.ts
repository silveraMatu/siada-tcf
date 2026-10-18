import { api } from '@/lib/api';
import { quitarSeparadoresDni, type RegistroFormValues } from '../types';

/** Registra un usuario: queda inactivo hasta que un administrador lo habilite. */
export async function registrarUsuario(
  data: RegistroFormValues,
): Promise<unknown> {
  const { data: usuario } = await api.post('/auth/registro', {
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    dni: quitarSeparadoresDni(data.dni.trim()),
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });
  return usuario;
}
