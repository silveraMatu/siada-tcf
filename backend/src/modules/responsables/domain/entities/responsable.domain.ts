//datos del Usuario que se muestran junto al responsable
export type UsuarioResumen = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
};

export class Responsable {
  constructor(
    //nombre, apellido y email viven en Usuario
    public readonly usuarioId: number,
    //null hasta que un administrador asigne el responsable a un organismo
    public readonly organismoId: number | null = null,
    //inicia en true; el cliente no elige el estado inicial
    public readonly active: boolean = true,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //solo viene cargado en el listado
    public readonly usuario?: UsuarioResumen,
  ) {}
}
