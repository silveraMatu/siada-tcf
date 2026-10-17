export class Responsable {
  constructor(
    public readonly nombre: string,
    public readonly apellido: string,
    public readonly email: string,
    //null hasta que un administrador asigne el responsable a un organismo
    public readonly organismoId: number | null = null,
    //inicia en true; el cliente no elige el estado inicial
    public readonly activo: boolean = true,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}
