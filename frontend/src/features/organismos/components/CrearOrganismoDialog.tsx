import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useCrearOrganismo } from '../hooks/useCrearOrganismo';
import { CrearOrganismoSchema, type CrearOrganismoValues } from '../types';

export function CrearOrganismoDialog() {
  const [open, setOpen] = useState(false);
  const crear = useCrearOrganismo();

  const form = useForm<CrearOrganismoValues>({
    resolver: zodResolver(CrearOrganismoSchema),
    mode: 'onTouched',
    defaultValues: { nombre: '', rubro: '' },
  });

  function cambiarApertura(abierto: boolean) {
    // Mientras se guarda no se cierra: evita perder el resultado de la operación.
    if (crear.isPending) return;
    setOpen(abierto);
    if (!abierto) {
      form.reset();
      crear.reset();
    }
  }

  function onSubmit(values: CrearOrganismoValues) {
    crear.mutate(values, {
      onSuccess: () => {
        form.reset();
        crear.reset();
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nuevo Organismo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo organismo</DialogTitle>
          <DialogDescription>
            Registre un organismo para que pueda presentar sus rendiciones.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Organismo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej.: Municipalidad de Clorinda"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rubro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rubro</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej.: Municipio, Comisión de Fomento"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {crear.isError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle p-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {getErrorMessage(crear.error)}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => cambiarApertura(false)}
                disabled={crear.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending && <Loader2 className="animate-spin" />}
                Crear Organismo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
