import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import type { ObservacionResponseDto } from './dto/observacion-response.dto.js';

export function aObservacionResponse(
  observacion: Observaciones,
): ObservacionResponseDto {
  return {
    id: observacion.id!,
    cuentaMensualId: observacion.cuentaMensualId,
    ejecucionId: observacion.ejecucionId!,
    codigoRegla: observacion.codigoRegla,
    tipo: observacion.tipo,
    descripcion: observacion.descripcion,
    libroOrigen: observacion.libroOrigen,
    estado: observacion.estado,
    transaccionId: observacion.transaccionId ?? null,
    transaccionIngresoEgresoId: observacion.transaccionIngresoEgresoId ?? null,
    valorInformado: observacion.valorInformado ?? null,
    valorCalculado: observacion.valorCalculado ?? null,
    diferencia: observacion.diferencia ?? null,
    motivoDescarte: observacion.motivoDescarte ?? null,
    revisadaPorId: observacion.revisadaPorId ?? null,
    revisadaEn: observacion.revisadaEn?.toISOString() ?? null,
  };
}
