import asistenteConfig from './asistente.config.js';

describe('asistenteConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sin variables no lanza: queda sin URL ni clave y con el timeout por defecto', () => {
    vi.stubEnv('IA_SERVICE_URL', '');
    vi.stubEnv('IA_SERVICE_API_KEY', '');
    vi.stubEnv('IA_SERVICE_TIMEOUT_MS', '');

    expect(asistenteConfig()).toEqual({
      url: null,
      apiKey: null,
      timeoutMs: 120_000,
    });
  });

  it('recorta espacios y las barras finales de la URL', () => {
    vi.stubEnv('IA_SERVICE_URL', '  http://127.0.0.1:8000///  ');
    vi.stubEnv('IA_SERVICE_API_KEY', ' clave ');

    expect(asistenteConfig()).toMatchObject({
      url: 'http://127.0.0.1:8000',
      apiKey: 'clave',
    });
  });

  it('usa el timeout configurado y vuelve al por defecto si no es un número positivo', () => {
    vi.stubEnv('IA_SERVICE_TIMEOUT_MS', '5000');
    expect(asistenteConfig().timeoutMs).toBe(5000);

    for (const invalido of ['abc', '0', '-10']) {
      vi.stubEnv('IA_SERVICE_TIMEOUT_MS', invalido);
      expect(asistenteConfig().timeoutMs).toBe(120_000);
    }
  });
});
