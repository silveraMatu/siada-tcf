import { SetMetadata } from '@nestjs/common';
import type { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';

export const REGISTRAR_KEY = 'registrarActividad';

//qué parte de la petición dice sobre qué entidad se actuó
export interface OpcionesRegistrar {
  accion: AccionActividad;
  entidad?: string;
  //nombre del parámetro de ruta con el id de la entidad
  idParam?: string;
  //propiedad de la respuesta con el id de la entidad (para las altas, que no tienen id en la ruta)
  idRespuesta?: string;
  //parámetro de ruta con el id de la cuenta mensual / del organismo
  cuentaParam?: string;
  organismoParam?: string;
}

//marca un endpoint para que quede en la bitácora (éxito, fallo y rechazos de acceso)
export const Registrar = (
  accion: AccionActividad,
  opciones: Omit<OpcionesRegistrar, 'accion'> = {},
) => SetMetadata(REGISTRAR_KEY, { accion, ...opciones });
