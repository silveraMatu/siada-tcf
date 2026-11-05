//faltan IA_SERVICE_URL o IA_SERVICE_API_KEY: el asistente es opcional y no está configurado
export class AsistenteNoConfiguradoError extends Error {
  constructor() {
    super('El asistente de IA no está configurado.');
    this.name = 'AsistenteNoConfiguradoError';
  }
}

//el servicio de IA no respondió bien: red, tiempo de espera, error del servicio o respuesta inesperada
export class AsistenteNoDisponibleError extends Error {
  constructor() {
    super('El servicio de IA no está disponible.');
    this.name = 'AsistenteNoDisponibleError';
  }
}
