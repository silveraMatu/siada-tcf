import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'

// La página se limita al diseño exterior; el formulario y su lógica viven en auth.
export function LoginPage() {
  return (
    <AuthLayout
      variant="glass"
      title="Iniciar sesión"
      subtitle="Sistema de Información y Administración del tribunal de cuentas"
    >
      <LoginForm />
    </AuthLayout>
  )
}
