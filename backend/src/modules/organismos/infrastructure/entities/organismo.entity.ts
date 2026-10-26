import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { CuentaAnualEntity } from '../../../cuentas/infrastructure/entities/cuenta-anual.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';
import { ResponsableEntity } from '../../../responsables/infrastructure/entities/responsable.entity.js';

@Entity('organismos')
export class OrganismoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 255,
    default: 'General',
  })
  rubro: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  //auditor asignado por el juez de trámite; el historial de reasignaciones queda en la bitácora
  @Column({ type: 'int', name: 'auditor_id', nullable: true })
  auditorId: number | null;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'auditor_id' })
  auditor: Relation<UsuarioEntity> | null;

  @OneToMany(() => CuentaAnualEntity, (cuentaAnual) => cuentaAnual.organismo)
  cuentasAnuales: Relation<CuentaAnualEntity[]>;

  @OneToMany(() => ResponsableEntity, (responsable) => responsable.organismo)
  responsables: Relation<ResponsableEntity[]>;
}
