import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import {
  asegurarResponsable,
  asignarOrganismo,
  obtenerResponsablesSinOrganismo,
} from './responsables.api';

const errorHttp = (status: number) =>
  new AxiosError('fallo', 'ERR', undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);

afterEach(() => vi.restoreAllMocks());

describe('responsables.api', () => {
  it('pide solo los responsables sin organismo', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    await obtenerResponsablesSinOrganismo();
    expect(get).toHaveBeenCalledWith('/responsables', {
      params: { sinOrganismo: true },
    });
  });

  it('asigna el organismo con PATCH', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    await asignarOrganismo(4, 9);
    expect(patch).toHaveBeenCalledWith('/responsables/4/organismo', {
      organismoId: 9,
    });
  });
});

describe('asegurarResponsable', () => {
  it('devuelve true cuando crea el responsable', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    expect(await asegurarResponsable(7)).toBe(true);
    expect(post).toHaveBeenCalledWith('/responsables', { usuarioId: 7 });
  });

  it('devuelve false si ya existía (409)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(errorHttp(409));
    expect(await asegurarResponsable(7)).toBe(false);
  });

  it.each([400, 404, 500])('propaga un error %i', async (status) => {
    vi.spyOn(api, 'post').mockRejectedValue(errorHttp(status));
    await expect(asegurarResponsable(7)).rejects.toBeInstanceOf(AxiosError);
  });
});
