import { Injectable } from '@nestjs/common';
import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { IngresosEgresosRepositoryPort } from '../ports/out/ingresos-egresos-repository.port.js';

//lectura interna sin control de acceso (la usa auditoría, ya restringida a ADMIN y AUDITOR):
//a diferencia de ObtenerIngresosEgresosUseCase, devuelve null en vez de 404 si no hay libro
@Injectable()
export class BuscarIngresosEgresosUseCase {
  constructor(
    private readonly ingresosEgresosRepository: IngresosEgresosRepositoryPort,
  ) {}

  async execute(cuentaMensualId: number): Promise<IngresosEgresos | null> {
    return await this.ingresosEgresosRepository.buscarPorCuentaMensualId(
      cuentaMensualId,
    );
  }
}
