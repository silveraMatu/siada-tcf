import { Rol } from '../enums/rol.enum.js';

export class Usuario {
  constructor(
    public readonly nombre: string,
    public readonly apellido: string,
    public readonly cuitDni: string,
    public readonly email: string,
    public readonly password: string,
    //nace inactivo, un administrador debe aprobarlo antes de que pueda operar
    public readonly active: boolean = false,
    //sin roles hasta que un administrador los asigne
    public readonly roles: Rol[] = [],
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}

export type UsuarioSinPassword = Omit<Usuario, 'password'>;
