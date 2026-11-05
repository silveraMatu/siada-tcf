import { registerAs } from '@nestjs/config';

//una consulta puede encadenar varias llamadas al modelo (el servicio de IA permite hasta 6 de 60 s)
const TIMEOUT_POR_DEFECTO_MS = 120_000;

//el asistente es opcional: sin URL o sin clave el backend arranca igual y el endpoint responde 503 (ver .env.example)
export default registerAs('asistente', () => {
  const url = process.env.IA_SERVICE_URL?.trim();
  const apiKey = process.env.IA_SERVICE_API_KEY?.trim();
  const timeoutMs = Number.parseInt(
    process.env.IA_SERVICE_TIMEOUT_MS ?? '',
    10,
  );
  return {
    url: url ? url.replace(/\/+$/, '') : null,
    apiKey: apiKey ? apiKey : null,
    timeoutMs: timeoutMs > 0 ? timeoutMs : TIMEOUT_POR_DEFECTO_MS,
  };
});
