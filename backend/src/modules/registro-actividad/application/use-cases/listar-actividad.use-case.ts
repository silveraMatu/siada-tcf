import { Injectable } from '@nestjs/common';
import {
  RegistroActividadRepositoryPort,
  type FiltrosActividad,
  type PaginaActividad,
} from '../ports/out/registro-actividad-repository.port.js';

export const LIMITE_POR_DEFECTO = 50;
export const LIMITE_MAXIMO = 200;

@Injectable()
export class ListarActividadUseCase {
  constructor(private readonly repository: RegistroActividadRepositoryPort) {}

  async execute(
    filtros: FiltrosActividad,
    limite = LIMITE_POR_DEFECTO,
    cursor?: number,
  ): Promise<PaginaActividad> {
    return await this.repository.listar(
      filtros,
      Math.min(Math.max(limite, 1), LIMITE_MAXIMO),
      cursor,
    );
  }
}
