import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { MOCK_RESULTADOS } from '../mocks/resultados.mock';
import { ejecutarValidaciones } from './auditoria.api';

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('ejecutarValidaciones', () => {
  it('audita por la ruta de documentos, sin body, y devuelve los resultados', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: MOCK_RESULTADOS });

    const resultados = await ejecutarValidaciones(5);

    expect(api.post).toHaveBeenCalledWith(
      '/auditoria/cuentas-mensuales/5/documentos/auditar',
    );
    expect(resultados).toBe(MOCK_RESULTADOS);
  });
});
