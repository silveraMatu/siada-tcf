import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';
import { TransaccionRaciEntity } from './transaccion-raci.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';

//un solo libro RACI por rendición mensual
@Entity('raci')
@Unique('UQ_raci_cuenta_mensual', ['cuentaMensualId'])
export class RaciEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  //quién lo subió y sha256 de su contenido; la fecha de subida es fecha_creacion
  @Column({ type: 'int', name: 'subido_por_id' })
  subidoPorId: number;

  @Column({ type: 'char', length: 64, name: 'hash_contenido' })
  hashContenido: string;

  @ManyToOne(() => UsuarioEntity)
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor: Relation<UsuarioEntity>;

  //sin lado inverso: la cuenta mensual no necesita conocer este libro
  @ManyToOne(() => CuentaMensualEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cuenta_mensual_id' })
  cuentaMensual: Relation<CuentaMensualEntity>;

  @OneToMany(() => TransaccionRaciEntity, (transaccion) => transaccion.raci)
  transacciones: Relation<TransaccionRaciEntity[]>;
}
