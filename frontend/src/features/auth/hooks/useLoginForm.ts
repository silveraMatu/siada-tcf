import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/context'
import { loginSchema, type LoginSchemaType } from '../schema'
import { canManageUsers, formatLoginError } from '../utils'

// Reúne el estado del formulario, la petición de acceso y la navegación posterior.
export function useLoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Conecta la validación de Zod con React Hook Form y define valores iniciales.
  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Envía las credenciales, muestra errores y redirige según el rol recibido.
  const onSubmit = async (values: LoginSchemaType) => {
    setIsLoading(true)
    setApiError(null)

    try {
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      })

      navigate(canManageUsers(user.rol) ? '/admin/usuarios' : '/dashboard')
    } catch (error) {
      setApiError(formatLoginError(error))
    } finally {
      setIsLoading(false)
    }
  }

  return { apiError, form, isLoading, onSubmit }
}
