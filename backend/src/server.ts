import { buildApp } from './app.js';

const server = buildApp();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await server.listen({ port, host });
    console.log(` Servidor corriendo en http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();