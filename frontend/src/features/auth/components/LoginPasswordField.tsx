import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
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

type LoginPasswordFieldProps = {
  control: Control<LoginSchemaType>
}

// Conserva la alternancia de visibilidad junto al campo que controla.
export function LoginPasswordField({ control }: LoginPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <FormField
      control={control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-[#d4d9d3]">
            Contraseña
          </FormLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#a7b9a0]" />
            <FormControl>
              <Input
                type={isVisible ? 'text' : 'password'}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                className="login-input h-11 w-full border-[#39433b] bg-[#131715] py-2 pl-10 pr-11 text-sm text-[#e6eae5] placeholder:text-[#788078] focus-visible:border-[#879b80] focus-visible:ring-[#879b80]/30"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setIsVisible((visible) => !visible)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#a7b9a0] transition-colors hover:text-[#e6eae5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#879b80] cursor-pointer"
              aria-label={isVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <FormMessage className="mt-1 text-xs font-medium text-red-300" />
        </FormItem>
      )}
    />
  )
}
