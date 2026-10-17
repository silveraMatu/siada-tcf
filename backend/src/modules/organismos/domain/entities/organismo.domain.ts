export class Organismo {
  constructor(
    public readonly nombre: string,
    public readonly rubro: string,
    //por ahora inicia en true; luego iniciara en false hasta que un admin habilite el organismo
    public readonly active: boolean = true,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}
