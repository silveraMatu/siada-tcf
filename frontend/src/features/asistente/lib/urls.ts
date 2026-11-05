/** Solo enlaces web o de correo: nada de `javascript:` ni `data:` salido del modelo o de una rendición. */
export function urlSegura(url: string): string {
  return /^(https?:|mailto:)/i.test(url.trim()) ? url : '';
}
