export class Organismo{
  constructor(
    public readonly id: number | null,
    public readonly nombre: string,
    public readonly rubro: string,
    public readonly fechaCreacion?: Date
  )
  { }
}
