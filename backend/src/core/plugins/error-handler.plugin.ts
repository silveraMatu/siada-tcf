import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {

    //Manejo de errores de zod y errores de validación de esquema
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Error de validación en los datos enviados',
        issues: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    //Manejo de errores de validacion del validador de fastify
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Error de validación de esquema',
        issues: error.validation,
      });
    }

    //Errores de dominio conocidos
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Ocurrió un error interno en el servidor',
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });