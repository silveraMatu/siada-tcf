import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { CuentaAnualEntity } from './cuenta-anual.entity.js';
import { LibroBancoEntity } from '../../../libro-banco/infrastructure/entities/libro-banco.entity.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';

@Entity('cuentas_mensuales')
@Unique('UQ_cuenta_mensual_anual_mes', ['cuentaAnualId', 'mes'])
export class CuentaMensualEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: 'Número de mes: 1 a 12' })
  mes: number;

  @Column({ type: 'int', name: 'cuenta_anual_id' })
  cuentaAnualId: number;

  @Column({
    type: 'enum',
    name: 'estado',
    enum: EstadoCuentaMensual,
    default: EstadoCuentaMensual.EN_BORRADOR,
  })
  estado: EstadoCuentaMensual;

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
