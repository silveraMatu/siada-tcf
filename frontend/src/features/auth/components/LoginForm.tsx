import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useLoginForm } from '../hooks/useLoginForm'
import { LoginEmailField } from './LoginEmailField'
import { LoginPasswordField } from './LoginPasswordField'

// Compone los campos reutilizables y conecta el envío con la lógica de autenticación.
export function LoginForm() {
  const {form, isLoading, onSubmit } = useLoginForm()

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <LoginEmailField control={form.control} />
        <LoginPasswordField control={form.control} />
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-lg bg-[#a7b9a0] text-sm font-semibold text-[#141914] transition-colors hover:bg-[#b8c7b1] active:bg-[#95a88e] disabled:opacity-60 sm:h-12 sm:text-base"
        >
          {isLoading ? 'Ingresando al sistema...' : 'Ingresar'}
        </Button>
      </form>
    </Form>
  )
}
