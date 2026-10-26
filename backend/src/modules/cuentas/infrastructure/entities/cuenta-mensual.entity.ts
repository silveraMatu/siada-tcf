import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { CuentaAnualEntity } from './cuenta-anual.entity.js';
import { LibroBancoEntity } from '../../../libro-banco/infrastructure/entities/libro-banco.entity.js';
import { UsuarioEntity } from '../../../usuarios/infrastructure/entities/usuario.entity.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';

@Entity('cuentas_mensuales')
@Unique('UQ_cuenta_mensual_anual_mes', ['cuentaAnualId', 'mes'])
export class CuentaMensualEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: 'Número de mes: 1 a 12' })
  mes: number;

  @Column({ type: 'int', name: 'cuenta_anual_id' })
  cuentaAnualId: number;

  @Column({
    type: 'enum',
    name: 'estado',
    enum: EstadoCuentaMensual,
    default: EstadoCuentaMensual.EN_BORRADOR,
  })
  estado: EstadoCuentaMensual;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  //quién presentó la rendición y cuándo; la bitácora guarda además el evento completo
  @Column({ type: 'int', name: 'presentada_por_id', nullable: true })
  presentadaPorId: number | null;

  @Column({ type: 'timestamptz', name: 'presentada_en', nullable: true })
  presentadaEn: Date | null;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'presentada_por_id' })
  presentadaPor: Relation<UsuarioEntity> | null;

  @ManyToOne(
    () => CuentaAnualEntity,
    (cuentaAnual) => cuentaAnual.cuentasMensuales,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cuenta_anual_id' })
  cuentaAnual: Relation<CuentaAnualEntity>;

  @OneToMany(() => LibroBancoEntity, (libroBanco) => libroBanco.cuentaMensual)
  librosBanco: Relation<LibroBancoEntity[]>;
}
