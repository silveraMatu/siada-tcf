import { CuentaMensual } from "../../../domain/entities/cuenta-mensual.domain.js";

export abstract class CuentaMensualResolverPort {
  //obtiene o crea de forma atomica e idempotente la cuenta anual y la cuenta mensual (todo o nada)
  abstract resolver(
    organismoId: number,
    ejercicioFiscal: number,
    mes: number,
  ): Promise<CuentaMensual>;
}
