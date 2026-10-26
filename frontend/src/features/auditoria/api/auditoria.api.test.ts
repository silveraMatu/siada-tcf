import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import { auditarRendicion, obtenerEjecucion } from './auditoria.api';

vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

const error = (status: number) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { message: 'x' },
  } as AxiosResponse);

describe('auditarRendicion', () => {
  it('audita por la ruta de documentos, sin body, y devuelve los resultados', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: MOCK_RESULTADOS });

    const resultados = await auditarRendicion(5);

    expect(api.post).toHaveBeenCalledWith(
      '/auditoria/cuentas-mensuales/5/documentos/auditar',
    );
    expect(resultados).toBe(MOCK_RESULTADOS);
  });
});

describe('obtenerEjecucion', () => {
  it('pide la última ejecución de la rendición', async () => {
    const ejecucion = { id: 9, resultados: MOCK_RESULTADOS };
    vi.mocked(api.get).mockResolvedValue({ data: ejecucion });

    expect(await obtenerEjecucion(5)).toBe(ejecucion);
    expect(api.get).toHaveBeenCalledWith(
      '/auditoria/cuentas-mensuales/5/ejecucion',
    );
  });

  it('una rendición que nunca se auditó (404) no tiene ejecución', async () => {
    vi.mocked(api.get).mockRejectedValue(error(404));

    expect(await obtenerEjecucion(5)).toBeNull();
  });

  it('cualquier otro error se propaga: un 403 no es «sin auditar»', async () => {
    vi.mocked(api.get).mockRejectedValue(error(403));

    await expect(obtenerEjecucion(5)).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
