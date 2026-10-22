// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ingestarLibroBanco } from '../api/libro-banco.api';
import { parseLibroBanco } from '../lib/parse-libro-banco';
import { IngestaDialog } from './IngestaDialog';

vi.mock('../api/libro-banco.api', () => ({
  ingestarLibroBanco: vi.fn(),
  obtenerLibrosBanco: vi.fn(),
}));
vi.mock('../lib/parse-libro-banco', () => ({
  LibroBancoParseError: class extends Error {},
  parseLibroBanco: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// El Select de Radix no es fiable en jsdom: se lo reemplaza por un <select> nativo con la misma interfaz.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (valor: string) => void;
    children: ReactNode;
  }) => (
    <select
      aria-label="Tipo de documento"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Seleccione un tipo</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const fila = {
  fila: 8,
  transaccion: { aLaOrdenDe: 'Proveedor', depositos: 0, retiro: 10, saldo: 90 },
  errores: [],
};

//409 con el cuerpo que arma el backend cuando ya hay un libro con ese N° de cuenta
const errorLibroDuplicado = () =>
  new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: {
      statusCode: 409,
      codigo: 'LIBRO_DUPLICADO',
      message: 'Ya existe un libro para la cuenta corriente 100234/1.',
      libroExistente: {
        id: 40,
        numeroCuentaCte: '100234/1',
        fechaCreacion: '2026-10-15T12:00:00.000Z',
        cantidadTransacciones: 10,
      },
    },
  } as AxiosResponse);

const errorCuentaPresentada = () =>
  new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: { message: 'No se pueden modificar ni subir libros' },
  } as AxiosResponse);

function renderDialogo() {
  const onIngestada = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <IngestaDialog
        open
        onOpenChange={vi.fn()}
        cuentaMensualId={5}
        onIngestada={onIngestada}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onIngestada };
}

//elige el tipo de documento y sube un archivo (el parser está simulado)
async function subirArchivo(
  user: ReturnType<typeof userEvent.setup>,
  numeroCuentaCte?: string,
) {
  vi.mocked(parseLibroBanco).mockReturnValue({
    numeroCuentaCte,
    filas: [fila, { ...fila, fila: 9 }],
  });
  await user.selectOptions(screen.getByLabelText('Tipo de documento'), [
    'libro-banco',
  ]);
  const archivo = new File(['contenido'], 'libro.xlsx');
  Object.assign(archivo, {
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
  const entrada = document.querySelector('input[type="file"]');
  await user.upload(entrada as HTMLInputElement, archivo);
  await screen.findByText('libro.xlsx');
}

const botonEnviar = () =>
  screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement;

beforeEach(() => {
  vi.mocked(ingestarLibroBanco).mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('IngestaDialog', () => {
  describe('N° de cuenta corriente obligatorio', () => {
    it('sin N° detectado en el archivo no se puede enviar hasta completarlo', async () => {
      const { user } = renderDialogo();
      await subirArchivo(user, undefined);

      expect(botonEnviar().disabled).toBe(true);
      expect(
        screen.getByText(/Complete el N° de cuenta corriente para poder enviar/),
      ).toBeTruthy();

      await user.type(screen.getByLabelText(/N° de Cta\. Cte\./), '100234/1');

      expect(botonEnviar().disabled).toBe(false);
    });

    it('un N° con solo espacios tampoco alcanza', async () => {
      const { user } = renderDialogo();
      await subirArchivo(user, undefined);

      await user.type(screen.getByLabelText(/N° de Cta\. Cte\./), '   ');

      expect(botonEnviar().disabled).toBe(true);
    });

    it('con el N° detectado envía el libro con el N° recortado y sin pedir reemplazo', async () => {
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, '100234/1');

      await user.click(botonEnviar());

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      const [cuentaId, payload] = vi.mocked(ingestarLibroBanco).mock.calls[0];
      expect(cuentaId).toBe(5);
      expect(payload.numeroCuentaCte).toBe('100234/1');
      expect(payload.transacciones).toHaveLength(2);
      expect('reemplazar' in payload).toBe(false);
      expect(toast.success).toHaveBeenCalledWith(
        'Libro Banco enviado: 2 transacciones cargadas.',
      );
    });
  });

  describe('ya hay un libro con ese N° de cuenta', () => {
    it('ofrece reemplazarlo mostrando el libro existente, sin dar el aviso como error', async () => {
      vi.mocked(ingestarLibroBanco).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, '100234/1');

      await user.click(botonEnviar());

      expect(
        await screen.findByText('Ya hay un libro para esta cuenta corriente'),
      ).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Reemplazar libro' }),
      ).toBeTruthy();
      expect(toast.error).not.toHaveBeenCalled();
      expect(onIngestada).not.toHaveBeenCalled();
    });

    it('«Reemplazar libro» reenvía el mismo archivo con reemplazar=true', async () => {
      vi.mocked(ingestarLibroBanco).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, '100234/1');
      await user.click(botonEnviar());

      await user.click(
        await screen.findByRole('button', { name: 'Reemplazar libro' }),
      );

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      expect(ingestarLibroBanco).toHaveBeenCalledTimes(2);
      const segundo = vi.mocked(ingestarLibroBanco).mock.calls[1][1];
      expect(segundo).toMatchObject({
        numeroCuentaCte: '100234/1',
        reemplazar: true,
      });
      expect(segundo.transacciones).toHaveLength(2);
      expect(toast.success).toHaveBeenCalledWith(
        'Libro reemplazado: 2 transacciones cargadas.',
      );
    });

    it('«Cancelar» rechaza la operación: no se reenvía nada y el diálogo sigue abierto', async () => {
      vi.mocked(ingestarLibroBanco).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, '100234/1');
      await user.click(botonEnviar());
      await screen.findByText('Ya hay un libro para esta cuenta corriente');

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() =>
        expect(
          screen.queryByText('Ya hay un libro para esta cuenta corriente'),
        ).toBeNull(),
      );
      expect(ingestarLibroBanco).toHaveBeenCalledTimes(1);
      expect(onIngestada).not.toHaveBeenCalled();
      // el archivo sigue cargado: se puede cambiar el N° de cuenta y volver a enviar
      expect(screen.getByText('libro.xlsx')).toBeTruthy();
      expect(botonEnviar().disabled).toBe(false);
    });

    it('tras rechazar, con otro N° de cuenta el libro se envía sin reemplazar nada', async () => {
      vi.mocked(ingestarLibroBanco).mockRejectedValueOnce(
        errorLibroDuplicado(),
      );
      const { user, onIngestada } = renderDialogo();
      await subirArchivo(user, '100234/1');
      await user.click(botonEnviar());
      await screen.findByText('Ya hay un libro para esta cuenta corriente');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      const campo = screen.getByLabelText(/N° de Cta\. Cte\./);
      await user.clear(campo);
      await user.type(campo, '100234/2');
      await user.click(botonEnviar());

      await waitFor(() => expect(onIngestada).toHaveBeenCalledTimes(1));
      const payload = vi.mocked(ingestarLibroBanco).mock.calls[1][1];
      expect(payload.numeroCuentaCte).toBe('100234/2');
      expect('reemplazar' in payload).toBe(false);
    });

    it('un 409 por cuenta ya presentada sigue mostrándose como error, sin ofrecer reemplazo', async () => {
      vi.mocked(ingestarLibroBanco).mockRejectedValueOnce(
        errorCuentaPresentada(),
      );
      const { user } = renderDialogo();
      await subirArchivo(user, '100234/1');

      await user.click(botonEnviar());

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
      expect(
        screen.queryByText('Ya hay un libro para esta cuenta corriente'),
      ).toBeNull();
    });
  });
});
