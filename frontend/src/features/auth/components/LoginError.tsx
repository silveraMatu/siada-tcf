import { AlertCircle } from 'lucide-react'

type LoginErrorProps = {
  message: string
}

// Presenta los errores del servidor con semántica accesible para lectores de pantalla.
export function LoginError({ message }: LoginErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-950/60 p-3.5 text-sm text-red-200 backdrop-blur-sm shadow-md"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-red-300 sm:text-sm">
          No se pudo iniciar sesión
        </span>
        <span className="text-xs leading-relaxed text-red-200/90 sm:text-sm">
          {message}
        </span>
      </div>
    </div>
  )
}
