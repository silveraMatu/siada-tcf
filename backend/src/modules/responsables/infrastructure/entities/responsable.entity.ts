import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { OrganismoEntity } from '../../../organismos/infrastructure/entities/organismo.entity.js';

@Entity('responsables')
export class ResponsableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'int', name: 'organismo_id', nullable: true })
  organismoId: number | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => OrganismoEntity, (organismo) => organismo.responsables, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organismo_id' })
  organismo: Relation<OrganismoEntity> | null;
}
