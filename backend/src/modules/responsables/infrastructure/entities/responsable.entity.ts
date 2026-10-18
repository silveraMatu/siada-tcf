import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { OrganismoEntity } from '../../../organismos/infrastructure/entities/organismo.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';

@Entity('responsables')
export class ResponsableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', name: 'organismo_id', nullable: true })
  organismoId: number | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  //el OneToOne crea un UNIQUE sobre usuario_id
  @OneToOne(() => UsuarioEntity, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<UsuarioEntity>;

  @ManyToOne(() => OrganismoEntity, (organismo) => organismo.responsables, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organismo_id' })
  organismo: Relation<OrganismoEntity> | null;
}
