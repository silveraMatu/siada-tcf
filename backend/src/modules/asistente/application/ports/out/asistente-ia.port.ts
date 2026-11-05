//lo que se le pregunta al servicio de IA
export interface ConsultaIA {
  pregunta: string;
  //organismo al que queda limitada la consulta; null si el auditor no tiene ninguno (la IA responde que no puede ayudar)
  organismoId: number | null;
  //datos para el prompt del modelo: nunca DNI, email ni contraseñas
  metadatosOrganismo: Record<string, unknown> | null;
  contextoRendicion: Record<string, unknown> | null;
}

export interface RespuestaIA {
  respuesta: string;
}

export abstract class AsistenteIAPort {
  //lanza AsistenteNoConfiguradoError o AsistenteNoDisponibleError
  abstract consultar(consulta: ConsultaIA): Promise<RespuestaIA>;
}
