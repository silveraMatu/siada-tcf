import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { loginUsuario } from '../api/auth.api';
import { useAuthStore } from './useAuth';

export function useLogin() {
  return useMutation({
    mutationFn: loginUsuario,
    onSuccess: ({ accessToken }) => useAuthStore.getState().login(accessToken),
    // Muestra el mensaje del backend, p. ej. "Su cuenta está pendiente de activación…".
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
