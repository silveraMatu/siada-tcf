import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  //Pipe global de validación Zod
  app.useGlobalPipes(new ZodValidationPipe());

  //Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('SIADA API - Módulo de Auditoría')
    .setDescription('API REST para ingesta y validación determinística de libros contables')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors({ origin: '*' });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API corriendo en: http://localhost:${port}/api/v1`);
  console.log(`Swagger disponible en: http://localhost:${port}/docs`);
}

bootstrap();