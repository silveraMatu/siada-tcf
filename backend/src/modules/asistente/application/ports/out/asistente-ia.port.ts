//lo que se le pregunta al servicio de IA
export interface ConsultaIA {
  pregunta: string;
  //organismo al que queda limitada la consulta; null si el auditor no tiene ninguno (la IA responde que no puede ayudar)
  organismoId: number | null;
  //datos para el prompt del modelo: nunca DNI, email ni contraseñas
  metadatosOrganismo: Record<string, unknown> | null;
  contextoRendicion: Record<string, unknown> | null;
}

//una acción del modelo contra la base: lo que el auditor ve para poder auditar a la IA
export interface PasoIA {
  //hoy solo 'consulta_sql'; queda como texto para sumar gráficos o tratamiento de datos
  accion: string;
  //el SQL ejecutado; si las guardas lo rechazaron, lo que escribió el modelo
  querySql: string;
  cantidadFilas: number | null;
  //tiempo contra la base; null si no hubo consulta (la validación la rechazó)
  duracionMs: number | null;
  error: string | null;
  //hubo más filas que las que vio el modelo
  truncado: boolean;
  columnas: string[];
  //las mismas filas que vio el modelo; importes y fechas como texto
  filas: unknown[][];
}

export interface RespuestaIA {
  respuesta: string;
  pasos: PasoIA[];
}

export abstract class AsistenteIAPort {
  //lanza AsistenteNoConfiguradoError o AsistenteNoDisponibleError
  abstract consultar(consulta: ConsultaIA): Promise<RespuestaIA>;
}
