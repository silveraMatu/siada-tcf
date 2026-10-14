import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation
} from 'typeorm';
import { LibroBancoEntity } from './libro-banco.entity.js';

@Entity('transacciones_libro_banco')
export class TransaccionLibroBancoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  fecha: string | null;

  @Column({ type: 'varchar', nullable: true })
  cheque: string | null;

  @Column({ type: 'text', name: 'a_la_orden_de' })
  aLaOrdenDe: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  depositos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  retiro: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  saldo: number;

  @Column({ type: 'int', name: 'libro_banco_id' })
  libroBancoId: number;

  @ManyToOne(
    () => LibroBancoEntity,
    (libroBanco) => libroBanco.transacciones,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'libro_banco_id' })
  libroBanco: Relation<LibroBancoEntity>;
}