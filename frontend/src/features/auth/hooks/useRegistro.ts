import { useMutation } from '@tanstack/react-query';

import { registrarUsuario } from '../api/auth.api';

export function useRegistro() {
  return useMutation({ mutationFn: registrarUsuario });
}
