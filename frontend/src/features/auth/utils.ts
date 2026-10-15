// Decide a qué sección dirigir al usuario según su rol recibido del servidor.
export function canManageUsers(role: string): boolean {
  const normalizedRole = role.trim().toLocaleLowerCase()
  return normalizedRole === 'admin' || normalizedRole === 'administrador'
}

// Convierte errores de red o autenticación a un mensaje que pueda mostrarse.
export function formatLoginError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado. Inténtelo nuevamente.'
}
