import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation
} from 'typeorm';
import { TransaccionLibroBancoEntity } from './transaccion-libro-banco.entity.js';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';

@Entity('libros_banco')
export class LibroBancoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  @Column({ type: 'varchar', name: 'numero_cuenta_cte', nullable: true })
  numeroCuentaCte: string | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(
    () => CuentaMensualEntity,
    (cuentaMensual) => cuentaMensual.librosBanco,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cuenta_mensual_id' })
  cuentaMensual: Relation<CuentaMensualEntity>;

  @OneToMany(
    () => TransaccionLibroBancoEntity,
    (transaccion) => transaccion.libroBanco,
    { cascade: true },
  )
  transacciones: Relation<TransaccionLibroBancoEntity[]>;
}