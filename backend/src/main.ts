import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configurarApp } from './app.setup.js';

async function bootstrap() {
  //false: configurarApp registra los parsers, con límites distintos por ruta
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configurarApp(app);

  const esProduccion = process.env.NODE_ENV === 'production';

  //Swagger apagado en producción salvo SWAGGER_ENABLED=true
  if (!esProduccion || process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SIADA API - Módulo de Auditoría')
      .setDescription(
        'API REST para ingesta y validación determinística de libros contables',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  //CORS_ORIGIN (separados por coma); sin definir: abierto en desarrollo, cerrado en producción
  const origenes = process.env.CORS_ORIGIN?.split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origenes?.length ? origenes : esProduccion ? false : '*',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API corriendo en: http://localhost:${port}/api/v1`);
  if (!esProduccion || process.env.SWAGGER_ENABLED === 'true') {
    console.log(`Swagger disponible en: http://localhost:${port}/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});
