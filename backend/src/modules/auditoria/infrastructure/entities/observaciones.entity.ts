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
import { decimalTransformer } from '../../../libro-banco/infrastructure/transformers/decimal.transformer.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';
import { EjecucionAuditoriaEntity } from './ejecucion-auditoria.entity.js';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';
import { TransaccionLibroBancoEntity } from '../../../libro-banco/infrastructure/entities/transaccion-libro-banco.entity.js';
import { TransaccionIngresoEgresoEntity } from '../../../ingresos-egresos/infrastructure/entities/transaccion-ingreso-egreso.entity.js';

//un hallazgo no se repite dentro de una ejecución. Son tres índices parciales porque en un UNIQUE común los
//NULL nunca chocan entre sí: uno por cada tipo de fila (banco o ingresos y egresos) y uno para los hallazgos
//de toda la cuenta (los cruces). Los nombres incluyen la ejecución a propósito: synchronize no reconstruye un
//índice existente cuando cambian sus columnas, pero sí descarta los de nombre viejo
@Index(
  'UQ_observaciones_ejecucion_fila_banco',
  ['ejecucionId', 'codigoRegla', 'transaccionId'],
  { unique: true, where: '"transaccion_libro_banco_id" IS NOT NULL' },
)
@Index(
  'UQ_observaciones_ejecucion_fila_ie',
  ['ejecucionId', 'codigoRegla', 'transaccionIngresoEgresoId'],
  { unique: true, where: '"transaccion_ingreso_egreso_id" IS NOT NULL' },
)
@Index('UQ_observaciones_ejecucion_sin_fila', ['ejecucionId', 'codigoRegla'], {
  unique: true,
  where:
    '"transaccion_libro_banco_id" IS NULL AND "transaccion_ingreso_egreso_id" IS NULL',
})
//una observación apunta a lo sumo a una fila: del banco o de ingresos y egresos
@Check(
  'CHK_observaciones_una_sola_fila',
  '"transaccion_libro_banco_id" IS NULL OR "transaccion_ingreso_egreso_id" IS NULL',
)
@Index('IDX_observaciones_cuenta_estado', ['cuentaMensualId', 'estado'])
@Index('IDX_observaciones_ejecucion_estado', ['ejecucionId', 'estado'])
@Entity('observaciones')
export class ObservacionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  //ejecución de auditoría que produjo el hallazgo
  @Column({ type: 'int', name: 'ejecucion_id' })
  ejecucionId: number;

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

  //importes del hallazgo, para sumarlos sin leer el texto
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'valor_informado',
    nullable: true,
    transformer: decimalTransformer,
  })
  valorInformado: number | null;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'valor_calculado',
    nullable: true,
    transformer: decimalTransformer,
  })
  valorCalculado: number | null;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  diferencia: number | null;

  //revisión del auditor: motivo (obligatorio al descartar), quién y cuándo
  @Column({ type: 'text', name: 'motivo_descarte', nullable: true })
  motivoDescarte: string | null;

  @Column({ type: 'int', name: 'revisada_por_id', nullable: true })
  revisadaPorId: number | null;

  @Column({ type: 'timestamptz', name: 'revisada_en', nullable: true })
  revisadaEn: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @ManyToOne(() => CuentaMensualEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cuenta_mensual_id' })
  cuentaMensual: Relation<CuentaMensualEntity>;

  @ManyToOne(() => EjecucionAuditoriaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ejecucion_id' })
  ejecucion: Relation<EjecucionAuditoriaEntity>;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'revisada_por_id' })
  revisadaPor: Relation<UsuarioEntity> | null;

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
