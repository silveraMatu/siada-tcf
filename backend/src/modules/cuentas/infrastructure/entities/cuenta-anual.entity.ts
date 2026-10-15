import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
  type Relation
} from 'typeorm';
import { OrganismoEntity } from '../../../organismos/infrastructure/entities/organismo.entity.js';
import { CuentaMensualEntity } from './cuenta-mensual.entity.js';

@Entity('cuentas_anuales')
@Unique('UQ_cuenta_anual_organismo_ejercicio', ['organismoId', 'ejercicioFiscal'])
export class CuentaAnualEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'ejercicio_fiscal' })
  ejercicioFiscal: number;

  @Column({ type: 'int', name: 'organismo_id' })
  organismoId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => OrganismoEntity, (organismo) => organismo.cuentasAnuales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organismo_id' })
  organismo: Relation<OrganismoEntity>;

  @OneToMany(
    () => CuentaMensualEntity,
    (cuentaMensual) => cuentaMensual.cuentaAnual,
  )
  cuentasMensuales: Relation<CuentaMensualEntity[]>;
}