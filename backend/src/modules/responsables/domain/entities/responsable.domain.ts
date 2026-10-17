export class Responsable {
  constructor(
    public readonly nombre: string,
    public readonly apellido: string,
    public readonly email: string,
    public readonly organismoId: number,
    //inicia en true; el cliente no elige el estado inicial
    public readonly activo: boolean = true,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}
