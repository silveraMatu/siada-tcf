import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { Rol } from '../../domain/enums/rol.enum.js';

//un usuario activo siempre tiene al menos un rol
@Check(
  'CHK_usuarios_activo_con_rol',
  'NOT "active" OR cardinality("roles") > 0',
)
@Entity('usuarios')
export class UsuarioEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  dni: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'enum', enum: Rol, array: true, default: [] })
  roles: Rol[];

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}
