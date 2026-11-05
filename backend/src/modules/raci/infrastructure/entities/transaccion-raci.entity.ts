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
import { RaciEntity } from './raci.entity.js';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto; los importes «del mes» arrancan en 0
const IMPORTE: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
};
//los acumulados y saldos no tienen valor por defecto y admiten signo
const SALDO: ColumnOptions = {
  type: 'decimal',
  precision: 14,
  scale: 2,
  transformer: decimalTransformer,
};

@Entity('transacciones_raci')
@Index('IDX_transacciones_raci_libro', ['raciId'])
export class TransaccionRaciEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  asiento: number;

  @Column({ type: 'varchar' })
  fecha: string;

  @Column({ type: 'varchar', nullable: true })
  expediente: string | null;

  @Column({ type: 'text' })
  concepto: string;

  @Column({
    type: 'varchar',
    name: 'compromiso_instrumento_legal',
    nullable: true,
  })
  compromisoInstrumentoLegal: string | null;

  @Column({ ...IMPORTE, name: 'compromiso_del_mes' })
  compromisoDelMes: number;

  @Column({ ...SALDO, name: 'compromiso_acumulado' })
  compromisoAcumulado: number;

  @Column({
    type: 'varchar',
    name: 'compromiso_orden_provision',
    nullable: true,
  })
  compromisoOrdenProvision: string | null;

  @Column({ ...IMPORTE, name: 'devengado_del_mes' })
  devengadoDelMes: number;

  @Column({ ...SALDO, name: 'devengado_acumulado' })
  devengadoAcumulado: number;

  @Column({ ...SALDO, name: 'devengado_saldo' })
  devengadoSaldo: number;

  @Column({ type: 'varchar', name: 'devengado_orden_pago', nullable: true })
  devengadoOrdenPago: string | null;

  @Column({ type: 'varchar', name: 'pago_numero_cheque', nullable: true })
  pagoNumeroCheque: string | null;

  @Column({ ...IMPORTE, name: 'pago_del_mes' })
  pagoDelMes: number;

  @Column({ ...SALDO, name: 'pago_acumulado' })
  pagoAcumulado: number;

  @Column({ ...SALDO, name: 'pago_saldo_a_pagar' })
  pagoSaldoAPagar: number;

  @Column({ type: 'int', name: 'raci_id' })
  raciId: number;

  @ManyToOne(() => RaciEntity, (libro) => libro.transacciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'raci_id' })
  raci: Relation<RaciEntity>;
}
