import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  type ColumnOptions,
  type Relation,
} from 'typeorm';
import { decimalTransformer } from '../../../libro-banco/infrastructure/transformers/decimal.transformer.js';
import { RaiEntity } from './rai.entity.js';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto; el ingreso diario arranca en 0
const IMPORTE: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
};
//los acumulados y el saldo no tienen valor por defecto y admiten signo
const SALDO: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  transformer: decimalTransformer,
};

@Entity('transacciones_rai')
@Index('IDX_transacciones_rai_libro', ['raiId'])
export class TransaccionRaiEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  asiento: number | null;

  @Column({ type: 'varchar' })
  fecha: string;

  @Column({ type: 'varchar', name: 'planilla_numero', nullable: true })
  planillaNumero: string | null;

  @Column({ type: 'text' })
  concepto: string;

  @Column({ ...IMPORTE, name: 'ingresos_diarios' })
  ingresosDiarios: number;

  @Column({ ...SALDO, name: 'ingresos_mensuales' })
  ingresosMensuales: number;

  @Column({ ...SALDO, name: 'ingresos_acumulados' })
  ingresosAcumulados: number;

  @Column({ ...SALDO })
  saldo: number;

  @Column({ type: 'int', name: 'rai_id' })
  raiId: number;

  @ManyToOne(() => RaiEntity, (libro) => libro.transacciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rai_id' })
  rai: Relation<RaiEntity>;
}
