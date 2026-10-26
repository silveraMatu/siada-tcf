//el auditor asignado, solo con lo necesario para mostrarlo
export interface AuditorAsignado {
  id: number;
  nombre: string;
  apellido: string;
}

export class Organismo {
  constructor(
    public readonly nombre: string,
    public readonly rubro: string,
    //por ahora inicia en true; luego iniciara en false hasta que un admin habilite el organismo
    public readonly active: boolean = true,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //usuario con rol AUDITOR que fiscaliza sus rendiciones (uno a la vez); null si no tiene
    public readonly auditorId: number | null = null,
    public readonly auditor: AuditorAsignado | null = null,
  ) {}
}
