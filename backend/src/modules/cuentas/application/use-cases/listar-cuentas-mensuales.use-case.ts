import { Injectable } from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';

@Injectable()
export class ListarCuentasMensualesUseCase {
  constructor(
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
  ) {}

  //lista vacía si ninguna coincide; sin filtros devuelve todas
  async execute(filtros?: {
    estado?: EstadoCuentaMensual;
  }): Promise<CuentaMensual[]> {
    return await this.cuentaMensualRepository.listar(filtros);
  }
}
