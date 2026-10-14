export class Organismo{
  constructor(
    public readonly id: number | null,
    public readonly nombre: string,
    public readonly rubro: string,
    //por ahora inicia en true; luego iniciara en false hasta que un admin habilite el organismo
    public readonly active: boolean = true,
    public readonly fechaCreacion?: Date
  )
  { }
}
