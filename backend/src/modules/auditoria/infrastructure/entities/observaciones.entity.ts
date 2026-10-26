import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
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
import { TransaccionIngresoEgresoEntity } from '../../../ingresos-egresos/infrastructure/entities/transaccion-ingreso-egreso.entity.js';

//un mismo hallazgo no se repite en una cuenta mensual, el motor puede reinsertar con orIgnore()
//son tres índices parciales porque en un UNIQUE común los NULL nunca chocan entre si:
//uno por cada tipo de fila (banco o ingresos y egresos) y uno para los hallazgos de toda la cuenta
@Index(
  'UQ_observaciones_hallazgo_transaccion',
  ['cuentaMensualId', 'codigoRegla', 'transaccionId'],
  { unique: true, where: '"transaccion_libro_banco_id" IS NOT NULL' },
)
@Index(
  'UQ_observaciones_hallazgo_transaccion_ie',
  ['cuentaMensualId', 'codigoRegla', 'transaccionIngresoEgresoId'],
  { unique: true, where: '"transaccion_ingreso_egreso_id" IS NOT NULL' },
)
//nombre nuevo a propósito: synchronize no actualiza el WHERE de un índice existente, pero sí descarta
//el de nombre viejo (UQ_observaciones_hallazgo_cuenta, que solo miraba la fila del banco) y crea este
@Index(
  'UQ_observaciones_hallazgo_sin_fila',
  ['cuentaMensualId', 'codigoRegla'],
  {
    unique: true,
    where:
      '"transaccion_libro_banco_id" IS NULL AND "transaccion_ingreso_egreso_id" IS NULL',
  },
)
//una observación apunta a lo sumo a una fila: del banco o de ingresos y egresos
@Check(
  'CHK_observaciones_una_sola_fila',
  '"transaccion_libro_banco_id" IS NULL OR "transaccion_ingreso_egreso_id" IS NULL',
)
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

  //fila exacta del libro banco que falló
  @Column({ type: 'int', name: 'transaccion_libro_banco_id', nullable: true })
  transaccionId: number | null;

  //fila exacta del libro de ingresos y egresos que falló
  @Column({
    type: 'int',
    name: 'transaccion_ingreso_egreso_id',
    nullable: true,
  })
  transaccionIngresoEgresoId: number | null;

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

  @ManyToOne(() => TransaccionIngresoEgresoEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'transaccion_ingreso_egreso_id' })
  transaccionIngresoEgreso: Relation<TransaccionIngresoEgresoEntity> | null;
}
