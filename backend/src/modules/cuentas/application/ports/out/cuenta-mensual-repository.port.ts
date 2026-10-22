import { CuentaMensual } from '../../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../domain/enums/estado-cuenta-mensual.enum.js';

export abstract class CuentaMensualRepositoryPort {
  abstract existe(cuentaMensualId: number): Promise<boolean>;

  abstract buscarPorId(cuentaMensualId: number): Promise<CuentaMensual | null>;

  //organismo dueño de la cuenta (vía su cuenta anual); null si la cuenta mensual no existe
  abstract obtenerOrganismoId(cuentaMensualId: number): Promise<number | null>;

  //¿la cuenta tiene al menos un libro cargado?
  abstract tieneLibros(cuentaMensualId: number): Promise<boolean>;

  //cambia el estado solo si sigue siendo `desde` (atómico); false si no existe o ya cambió
  abstract cambiarEstado(
    cuentaMensualId: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean>;

  //ordenadas por id; sin filtros devuelve todas. Incluye organismo y ejercicio de cada una
  abstract listar(filtros?: {
    estado?: EstadoCuentaMensual;
  }): Promise<CuentaMensualListada[]>;
}
