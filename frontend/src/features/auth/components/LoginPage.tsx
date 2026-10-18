import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

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
import { rutaInicial } from '@/components/layout/navigation';
import { useAuthStore } from '../hooks/useAuth';
import { useLogin } from '../hooks/useLogin';
import { LoginSchema, type LoginFormValues } from '../types';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, {
      // Cada rol aterriza en la primera sección que su menú le permite ver.
      onSuccess: () =>
        navigate(rutaInicial(useAuthStore.getState().user?.roles ?? [])),
    });
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1.5 p-8 pb-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Acceso a SIADA
          </CardTitle>
          <CardDescription>
            Ingrese con su cuenta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
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
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending && <Loader2 className="animate-spin" />}
                Iniciar Sesión
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/registro"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Solicita acceso aquí
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
