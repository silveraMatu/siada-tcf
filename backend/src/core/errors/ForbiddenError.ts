import { AppError } from "./AppError.js";

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso prohibido.') {
    super(message, 403);
  }
}