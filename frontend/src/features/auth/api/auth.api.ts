import { api } from '@/lib/api';
import {
  quitarSeparadoresDni,
  type LoginFormValues,
  type LoginResponse,
  type RegistroFormValues,
} from '../types';

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

/** Devuelve el JWT. Falla con 401 si las credenciales son inválidas o la cuenta sigue inactiva. */
export async function loginUsuario(
  data: LoginFormValues,
): Promise<LoginResponse> {
  const { data: respuesta } = await api.post<LoginResponse>('/auth/login', {
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });
  return respuesta;
}
