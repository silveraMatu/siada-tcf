import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  type Relation
} from 'typeorm';
import { CuentaAnualEntity } from '../../../cuentas/infrastructure/entities/cuenta-anual.entity.js';


@Entity('organismos')
export class OrganismoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({
    type: 'varchar',
    default: "General",
  })
  rubro: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @OneToMany(() => CuentaAnualEntity, (cuentaAnual) => cuentaAnual.organismo)
  cuentasAnuales: Relation<CuentaAnualEntity[]>;
}