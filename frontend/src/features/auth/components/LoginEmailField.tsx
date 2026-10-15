import { Mail } from 'lucide-react'
import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { LoginSchemaType } from '../schema'

type LoginEmailFieldProps = {
  control: Control<LoginSchemaType>
}

// Renderiza el campo de usuario y enlaza su valor y errores con el formulario.
export function LoginEmailField({ control }: LoginEmailFieldProps) {
  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-[#d4d9d3]">
            Correo electrónico/usuario
          </FormLabel>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#a7b9a0]" />
            <FormControl>
              <Input
                type="text"
                placeholder="Correo electrónico o usuario asignado"
                autoComplete="username"
                className="login-input h-11 w-full border-[#39433b] bg-[#131715] py-2 pl-10 pr-4 text-sm text-[#e6eae5] placeholder:text-[#788078] focus-visible:border-[#879b80] focus-visible:ring-[#879b80]/30"
                {...field}
              />
            </FormControl>
          </div>
          <FormMessage className="mt-1 text-xs font-medium text-red-300" />
        </FormItem>
      )}
    />
  )
}
