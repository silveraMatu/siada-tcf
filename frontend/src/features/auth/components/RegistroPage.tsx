import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api';
import { useRegistro } from '../hooks/useRegistro';
import { RegistroSchema, type RegistroFormValues } from '../types';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

function RegistroExitoso() {
  return (
    <Card className="w-full max-w-md text-center shadow-none">
      <CardContent className="flex flex-col items-center gap-6 px-8 py-10">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
          <Check className="size-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Registro Exitoso
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            Su cuenta ha sido creada y está pendiente de activación por parte de
            un administrador. Se le notificará cuando pueda ingresar.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/login">Volver al Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function RegistroPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const registro = useRegistro();

  const form = useForm<RegistroFormValues>({
    resolver: zodResolver(RegistroSchema),
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(values: RegistroFormValues) {
    registro.mutate(values, { onSuccess: () => setIsSuccess(true) });
  }

  return (
    <AuthShell>
      {isSuccess ? (
        <RegistroExitoso />
      ) : (
        <Card className="w-full max-w-md shadow-none">
          <CardHeader className="space-y-1.5 px-8 pt-8">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Crear cuenta
            </CardTitle>
            <CardDescription>
              Complete sus datos. Un administrador deberá activar su cuenta
              antes de que pueda ingresar.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input autoComplete="given-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input autoComplete="family-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="12345678"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="nombre@organismo.gob.ar"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {registro.isError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {getErrorMessage(registro.error)}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={registro.isPending}
                >
                  {registro.isPending && <Loader2 className="animate-spin" />}
                  Crear cuenta
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!isSuccess && (
        <p className="mt-6 text-sm text-slate-500">
          ¿Ya tiene cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
