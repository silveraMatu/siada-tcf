import type { EventoAsistente, PasoRazonamiento } from '../types';

export interface EventoSse {
  evento: string;
  datos: string;
}

/**
 * Lee un cuerpo `text/event-stream` y entrega un evento por vez. Ignora los comentarios (líneas que
 * empiezan con «:», que el servidor manda como keepalive), junta las líneas `data:` de un mismo evento
 * y tolera que un evento llegue partido entre varios fragmentos.
 */
export async function* leerEventosSse(
  cuerpo: ReadableStream<Uint8Array>,
): AsyncGenerator<EventoSse> {
  const lector = cuerpo.getReader();
  const decodificador = new TextDecoder();
  let pendiente = '';

  try {
    for (;;) {
      const { done, value } = await lector.read();
      pendiente += decodificador.decode(value, { stream: !done });
      // un «\r» final se deja: puede ser la mitad de un «\r\n» cortado entre dos fragmentos
      pendiente = pendiente.replace(/\r\n/g, '\n');

      let corte = pendiente.indexOf('\n\n');
      while (corte !== -1) {
        const evento = interpretarBloque(pendiente.slice(0, corte));
        pendiente = pendiente.slice(corte + 2);
        if (evento) yield evento;
        corte = pendiente.indexOf('\n\n');
      }

      if (done) {
        // el último evento puede no cerrarse con la línea en blanco
        const evento = interpretarBloque(pendiente);
        if (evento) yield evento;
        return;
      }
    }
  } finally {
    lector.releaseLock();
  }
}

function interpretarBloque(bloque: string): EventoSse | null {
  let evento = 'message';
  const datos: string[] = [];

  for (const linea of bloque.split('\n')) {
    if (linea === '' || linea.startsWith(':')) continue;
    const separador = linea.indexOf(':');
    const campo = separador === -1 ? linea : linea.slice(0, separador);
    let valor = separador === -1 ? '' : linea.slice(separador + 1);
    if (valor.startsWith(' ')) valor = valor.slice(1);

    if (campo === 'event') evento = valor;
    else if (campo === 'data') datos.push(valor);
  }

  return datos.length === 0 ? null : { evento, datos: datos.join('\n') };
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const numeroONull = (valor: unknown) =>
  typeof valor === 'number' ? valor : null;

function interpretarPaso(dato: unknown): PasoRazonamiento | null {
  if (
    !esObjeto(dato) ||
    typeof dato.id !== 'string' ||
    typeof dato.descripcion !== 'string' ||
    typeof dato.estado !== 'string'
  ) {
    return null;
  }
  return {
    id: dato.id,
    accion: typeof dato.accion === 'string' ? dato.accion : 'consulta_datos',
    descripcion: dato.descripcion,
    fuentes: Array.isArray(dato.fuentes)
      ? dato.fuentes.filter((f): f is string => typeof f === 'string')
      : [],
    estado: dato.estado,
    resultado: typeof dato.resultado === 'string' ? dato.resultado : null,
    cantidadRegistros: numeroONull(dato.cantidadRegistros),
    duracionMs: numeroONull(dato.duracionMs),
    parcial: dato.parcial === true,
  };
}

/**
 * Convierte un evento crudo en uno tipado. Devuelve null si no es un evento que la interfaz conozca
 * o si su cuerpo viene mal formado: el servidor puede sumar tipos nuevos y no hay que romperse por eso.
 */
export function interpretarEvento(bruto: EventoSse): EventoAsistente | null {
  let dato: unknown;
  try {
    dato = JSON.parse(bruto.datos);
  } catch {
    return null;
  }
  if (!esObjeto(dato)) return null;

  switch (bruto.evento) {
    case 'pensando':
      return typeof dato.mensaje === 'string'
        ? { tipo: 'pensando', mensaje: dato.mensaje }
        : null;
    case 'paso': {
      const paso = interpretarPaso(dato);
      return paso ? { tipo: 'paso', paso } : null;
    }
    case 'respuesta':
      return typeof dato.respuesta === 'string'
        ? {
            tipo: 'respuesta',
            respuesta: dato.respuesta,
            organismoId: numeroONull(dato.organismoId),
          }
        : null;
    case 'fin':
      return { tipo: 'fin' };
    case 'error':
      return typeof dato.mensaje === 'string'
        ? { tipo: 'error', mensaje: dato.mensaje }
        : null;
    default:
      return null;
  }
}
