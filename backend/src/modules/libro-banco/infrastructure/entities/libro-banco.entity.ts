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
import { TransaccionLibroBancoEntity } from './transaccion-libro-banco.entity.js';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';

//un solo libro por cuenta corriente dentro de la rendición mensual
//la columna sigue admitiendo NULL (libros anteriores a esta regla); el N° se exige al ingestar
@Entity('libros_banco')
@Unique('UQ_libro_banco_cuenta_numero', ['cuentaMensualId', 'numeroCuentaCte'])
export class LibroBancoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  @Column({ type: 'varchar', name: 'numero_cuenta_cte', nullable: true })
  numeroCuentaCte: string | null;

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
