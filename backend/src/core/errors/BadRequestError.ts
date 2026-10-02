import { AppError } from "./AppError.js";

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta.') {
    super(message, 400);
  }
}