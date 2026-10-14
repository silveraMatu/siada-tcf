import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  type Relation
} from 'typeorm';
import { CuentaAnualEntity } from './cuenta-anual.entity.js';
import { LibroBancoEntity } from '../../../libro-banco/infrastructure/entities/libro-banco.entity.js';

@Entity('cuentas_mensuales')
export class CuentaMensualEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: 'Número de mes: 1 a 12' })
  mes: number;

  @Column({ type: 'int', name: 'cuenta_anual_id' })
  cuentaAnualId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(
    () => CuentaAnualEntity,
    (cuentaAnual) => cuentaAnual.cuentasMensuales,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cuenta_anual_id' })
  cuentaAnual: Relation<CuentaAnualEntity>;

  @OneToMany(() => LibroBancoEntity, (libroBanco) => libroBanco.cuentaMensual)
  librosBanco: Relation<LibroBancoEntity[]>;
}