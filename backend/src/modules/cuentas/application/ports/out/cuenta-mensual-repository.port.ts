import { CuentaMensual } from '../../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../domain/enums/estado-cuenta-mensual.enum.js';

export abstract class CuentaMensualRepositoryPort {
  abstract existe(cuentaMensualId: number): Promise<boolean>;

  abstract buscarPorId(cuentaMensualId: number): Promise<CuentaMensual | null>;

  //organismo dueño de la cuenta (vía su cuenta anual); null si la cuenta mensual no existe
  abstract obtenerOrganismoId(cuentaMensualId: number): Promise<number | null>;

  //nombres legibles de los documentos obligatorios que la cuenta todavía no tiene cargados
  //(Libro Banco e Ingresos y Egresos); vacío si está completa
  abstract documentosFaltantes(cuentaMensualId: number): Promise<string[]>;

  //cambia el estado solo si sigue siendo `desde` (atómico); false si no existe o ya cambió
  abstract cambiarEstado(
    cuentaMensualId: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean>;

  //presenta la rendición en un único UPDATE atómico: EN_BORRADOR → LISTO_PARA_AUDITAR, guardando quién y
  //cuándo; false si no existe o ya no estaba en borrador
  abstract presentar(
    cuentaMensualId: number,
    usuarioId: number,
  ): Promise<boolean>;

  //ordenadas por id; sin filtros devuelve todas. Incluye organismo y ejercicio de cada una
  //y un resumen de sus libros (sin transacciones)
  abstract listar(filtros?: {
    estado?: EstadoCuentaMensual;
  }): Promise<CuentaMensualListada[]>;
}
