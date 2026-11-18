//catálogo cerrado de rubros: el servicio de IA elige su contexto por este código, así que
//cualquier alta o baja debe reflejarse en ia-agent-service (contexto_rubro.py); el nombre legible vive en el front
export enum Rubro {
  COMUNICACION_SOCIAL = 'COMUNICACION_SOCIAL',
  COMUNIDAD = 'COMUNIDAD',
  CULTURA_EDUCACION = 'CULTURA_EDUCACION',
  DESARROLLO_HUMANO = 'DESARROLLO_HUMANO',
  ECONOMIA_HACIENDA_FINANZAS = 'ECONOMIA_HACIENDA_FINANZAS',
  GOBIERNO_JUSTICIA_SEGURIDAD_TRABAJO = 'GOBIERNO_JUSTICIA_SEGURIDAD_TRABAJO',
  PLANIFICACION_OBRAS_SERVICIOS = 'PLANIFICACION_OBRAS_SERVICIOS',
  PRODUCCION_AMBIENTE = 'PRODUCCION_AMBIENTE',
  TURISMO = 'TURISMO',
  //secretarías especializadas y cualquier organismo fuera de los demás rubros: instrucciones genéricas
  OTROS = 'OTROS',
}
