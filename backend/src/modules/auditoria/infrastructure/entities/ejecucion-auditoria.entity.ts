import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { CuentaMensualEntity } from '../../../cuentas/infrastructure/entities/cuenta-mensual.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';
import type { ResumenResultado } from '../../domain/entities/ejecucion-auditoria.domain.js';

//una ejecución por rendición y versión de reglas: ejecutar de nuevo con las mismas reglas devuelve la existente
@Entity('ejecuciones_auditoria')
@Unique('UQ_ejecucion_cuenta_version', ['cuentaMensualId', 'versionReglas'])
export class EjecucionAuditoriaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'cuenta_mensual_id' })
  cuentaMensualId: number;

  @Column({ type: 'varchar', length: 20, name: 'version_reglas' })
  versionReglas: string;

  @Column({ type: 'int', name: 'ejecutada_por_id' })
  ejecutadaPorId: number;

  @Column({
    type: 'timestamptz',
    name: 'ejecutada_en',
    default: () => 'now()',
  })
  ejecutadaEn: Date;

  //resultado de cada regla (estado, cobertura, libros faltantes); los hallazgos están en `observaciones`
  @Column({ type: 'jsonb' })
  resultados: ResumenResultado[];

  @Column({ type: 'timestamptz', name: 'cerrada_en', nullable: true })
  cerradaEn: Date | null;

  @Column({ type: 'int', name: 'cerrada_por_id', nullable: true })
  cerradaPorId: number | null;

  @Column({ type: 'text', nullable: true })
  conclusion: string | null;

  //AUDITADA o CON_OBSERVACIONES, el estado en que quedó la rendición al cerrar
  @Column({ type: 'varchar', length: 30, name: 'estado_final', nullable: true })
  estadoFinal: string | null;

  @ManyToOne(() => CuentaMensualEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cuenta_mensual_id' })
  cuentaMensual: Relation<CuentaMensualEntity>;

  @ManyToOne(() => UsuarioEntity)
  @JoinColumn({ name: 'ejecutada_por_id' })
  ejecutadaPor: Relation<UsuarioEntity>;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'cerrada_por_id' })
  cerradaPor: Relation<UsuarioEntity> | null;
}
