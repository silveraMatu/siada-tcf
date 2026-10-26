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
import { IngresosEgresosEntity } from './ingresos-egresos.entity.js';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto; los importes de flujo arrancan en 0
const IMPORTE: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
};
//los saldos no tienen valor por defecto
const SALDO: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  transformer: decimalTransformer,
};

@Entity('transacciones_ingresos_egresos')
@Index('IDX_transacciones_ie_libro', ['ingresosEgresosId'])
export class TransaccionIngresoEgresoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  fila: number;

  @Column({ type: 'varchar' })
  fecha: string;

  @Column({ type: 'text' })
  concepto: string;

  @Column({ type: 'varchar', nullable: true })
  cheque: string | null;

  @Column({ type: 'varchar', nullable: true })
  comprobante: string | null;

  @Column({ ...IMPORTE, name: 'caja_debe' })
  cajaDebe: number;

  @Column({ ...IMPORTE, name: 'caja_haber' })
  cajaHaber: number;

  @Column({ ...SALDO, name: 'caja_saldo' })
  cajaSaldo: number;

  @Column({ ...IMPORTE, name: 'banco_debe' })
  bancoDebe: number;

  @Column({ ...IMPORTE, name: 'banco_haber' })
  bancoHaber: number;

  @Column({ ...SALDO, name: 'banco_saldo' })
  bancoSaldo: number;

  @Column({ ...IMPORTE, name: 'egreso_inc_1' })
  egresoInc1: number;

  @Column({ ...IMPORTE, name: 'egreso_inc_2' })
  egresoInc2: number;

  @Column({ ...IMPORTE, name: 'egreso_inc_3' })
  egresoInc3: number;

  @Column({ ...IMPORTE, name: 'egreso_inc_4' })
  egresoInc4: number;

  @Column({ ...IMPORTE, name: 'egreso_inc_5' })
  egresoInc5: number;

  @Column({ ...IMPORTE, name: 'ingreso_municipal' })
  ingresoMunicipal: number;

  @Column({ ...IMPORTE, name: 'ingreso_otras' })
  ingresoOtras: number;

  @Column({ type: 'text', name: 'cuentas_varias_concepto', nullable: true })
  cuentasVariasConcepto: string | null;

  @Column({ ...IMPORTE, name: 'cuentas_varias_debe' })
  cuentasVariasDebe: number;

  @Column({ ...IMPORTE, name: 'cuentas_varias_haber' })
  cuentasVariasHaber: number;

  @Column({ type: 'int', name: 'ingresos_egresos_id' })
  ingresosEgresosId: number;

  @ManyToOne(() => IngresosEgresosEntity, (libro) => libro.transacciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ingresos_egresos_id' })
  ingresosEgresos: Relation<IngresosEgresosEntity>;
}
