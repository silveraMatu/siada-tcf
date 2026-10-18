import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { setToken } from '@/lib/auth-token';
import { loginUsuario } from '../api/auth.api';

export function useLogin() {
  return useMutation({
    mutationFn: loginUsuario,
    onSuccess: ({ accessToken }) => setToken(accessToken),
    // Muestra el mensaje del backend, p. ej. "Su cuenta está pendiente de activación…".
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
