//un evento en el formato de Server-Sent Events; cada `data` va en una sola línea (JSON)
export function formatearSse(evento: string, datos: unknown): string {
  return `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
}
