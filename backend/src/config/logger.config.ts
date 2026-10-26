import type { Params } from 'nestjs-pino';

//logs operativos (stdout, JSON): distintos de la bitácora de actividad, que va a la base de datos
export function configurarLogger(): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL || 'info',
      //nunca se registran credenciales ni cookies
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTADO]',
      },
      //LOG_PRETTY=true: salida legible para desarrollo
      transport:
        process.env.LOG_PRETTY === 'true'
          ? { target: 'pino-pretty' }
          : undefined,
      autoLogging: {
        ignore: (req) => (req.url ?? '').startsWith('/docs'),
      },
    },
  };
}
