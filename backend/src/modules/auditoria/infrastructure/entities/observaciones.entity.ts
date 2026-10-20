import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../../domain/rules/validations.js';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';
import { TransaccionLibroBancoEntity } from '../../../libro-banco/infrastructure/entities/transaccion-libro-banco.entity.js';

//un mismo hallazgo no se repite en una cuenta mensual, el motor puede reinsertar con orIgnore()
//son dos índices parciales porque en un UNIQUE común los NULL de transaccion_libro_banco_id nunca chocan entre si
@Index(
  'UQ_observaciones_hallazgo_transaccion',
  ['cuentaMensualId', 'codigoRegla', 'transaccionId'],
  { unique: true, where: '"transaccion_libro_banco_id" IS NOT NULL' },
)
@Index('UQ_observaciones_hallazgo_cuenta', ['cuentaMensualId', 'codigoRegla'], {
  unique: true,
  where: '"transaccion_libro_banco_id" IS NULL',
})
@Index('IDX_observaciones_cuenta_estado', ['cuentaMensualId', 'estado'])
@Entity('observaciones')
export class ObservacionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  @Column({ type: 'enum', enum: validationsCode, name: 'codigo_regla' })
  codigoRegla: validationsCode;

  @Column({ type: 'enum', enum: validationsType })
  tipo: validationsType;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: LibroOrigen, name: 'libro_origen' })
  libroOrigen: LibroOrigen;

  @Column({
    type: 'enum',
    enum: EstadoObservacion,
    default: EstadoObservacion.ABIERTA,
  })
  estado: EstadoObservacion;

  //fila exacta que falló
  @Column({ type: 'int', name: 'transaccion_libro_banco_id', nullable: true })
  transaccionId: number | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => CuentaMensualEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cuenta_mensual_id' })
  cuentaMensual: Relation<CuentaMensualEntity>;

  @ManyToOne(() => TransaccionLibroBancoEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'transaccion_libro_banco_id' })
  transaccion: Relation<TransaccionLibroBancoEntity> | null;
}
