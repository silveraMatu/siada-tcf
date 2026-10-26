import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

//bitácora de solo inserción (un trigger impide modificarla o borrarla); sin claves foráneas a propósito:
//guarda lo que pasó tal como era, aunque después el usuario o el organismo cambien
@Index('IDX_registro_actividad_fecha', ['ocurridoEn'])
@Index('IDX_registro_actividad_usuario', ['usuarioId', 'ocurridoEn'])
@Index('IDX_registro_actividad_accion', ['accion', 'ocurridoEn'])
@Index('IDX_registro_actividad_organismo', ['organismoId', 'ocurridoEn'])
@Entity('registro_actividad')
export class RegistroActividadEntity {
  //bigint: llega como texto desde el driver, el mapper lo convierte
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'timestamptz', name: 'ocurrido_en' })
  ocurridoEn: Date;

  @Column({ type: 'int', name: 'usuario_id', nullable: true })
  usuarioId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apellido: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dni: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  roles: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 255, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64 })
  accion: string;

  @Column({ type: 'varchar', length: 16 })
  resultado: string;

  @Column({ type: 'int', name: 'codigo_http' })
  codigoHttp: number;

  @Column({ type: 'varchar', length: 40, name: 'entidad_tipo', nullable: true })
  entidadTipo: string | null;

  @Column({ type: 'int', name: 'entidad_id', nullable: true })
  entidadId: number | null;

  @Column({ type: 'int', name: 'organismo_id', nullable: true })
  organismoId: number | null;

  @Column({ type: 'int', name: 'cuenta_mensual_id', nullable: true })
  cuentaMensualId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, name: 'request_id', nullable: true })
  requestId: string | null;
}
