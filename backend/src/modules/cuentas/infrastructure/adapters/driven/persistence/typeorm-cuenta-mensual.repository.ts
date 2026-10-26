import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { cargarResumenesPersona } from '../../../../../../common/resumen-persona.js';
import { CuentaMensualRepositoryPort } from '../../../../application/ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensual } from '../../../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../../domain/entities/cuenta-mensual-listada.domain.js';
import { ResumenLibro } from '../../../../domain/entities/resumen-libro.domain.js';
import { EstadoCuentaMensual } from '../../../../domain/enums/estado-cuenta-mensual.enum.js';
import { TipoLibro } from '../../../../domain/enums/tipo-libro.enum.js';
import { IngresosEgresosEntity } from '../../../../../ingresos-egresos/infrastructure/entities/ingresos-egresos.entity.js';
import { LibroBancoEntity } from '../../../../../libro-banco/infrastructure/entities/libro-banco.entity.js';
import { CuentaMensualEntity } from '../../../entities/cuenta-mensual.entity.js';
import { CuentaMensualMapper } from '../../../mappers/cuenta-mensual.mapper.js';

@Injectable()
export class TypeOrmCuentaMensualRepositoryAdapter implements CuentaMensualRepositoryPort {
  constructor(
    @InjectRepository(CuentaMensualEntity)
    private readonly repository: Repository<CuentaMensualEntity>,
  ) {}

  async existe(id: number): Promise<boolean> {
    return await this.repository.exists({ where: { id } });
  }

  async buscarPorId(id: number): Promise<CuentaMensual | null> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) return null;
    const personas = await cargarResumenesPersona(this.repository.manager, [
      entity.presentadaPorId,
    ]);
    return CuentaMensualMapper.toDomain(
      entity,
      personas.get(entity.presentadaPorId ?? -1) ?? null,
    );
  }

  async obtenerOrganismoId(id: number): Promise<number | null> {
    const fila = await this.repository
      .createQueryBuilder('cm')
      .innerJoin('cm.cuentaAnual', 'ca')
      .select('ca.organismoId', 'organismoId')
      .where('cm.id = :id', { id })
      .getRawOne<{ organismoId: number }>();
    return fila ? fila.organismoId : null;
  }

  async documentosFaltantes(id: number): Promise<string[]> {
    const [tieneLibroBanco, tieneIngresosEgresos] = await Promise.all([
      this.repository.manager.exists(LibroBancoEntity, {
        where: { cuentaMensualId: id },
      }),
      this.repository.manager.exists(IngresosEgresosEntity, {
        where: { cuentaMensualId: id },
      }),
    ]);
    const faltantes: string[] = [];
    if (!tieneLibroBanco) faltantes.push('Libro Banco');
    if (!tieneIngresosEgresos) faltantes.push('Ingresos y Egresos');
    return faltantes;
  }

  async cambiarEstado(
    id: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean> {
    const resultado = await this.repository.update(
      { id, estado: desde },
      { estado: hacia },
    );
    return resultado.affected === 1;
  }

  async presentar(id: number, usuarioId: number): Promise<boolean> {
    const resultado = await this.repository.update(
      { id, estado: EstadoCuentaMensual.EN_BORRADOR },
      {
        estado: EstadoCuentaMensual.LISTO_PARA_AUDITAR,
        presentadaPorId: usuarioId,
        presentadaEn: new Date(),
      },
    );
    return resultado.affected === 1;
  }

  async listar(filtros?: {
    estado?: EstadoCuentaMensual;
    organismoIds?: number[];
  }): Promise<CuentaMensualListada[]> {
    //columnas en lista blanca: solo lo que necesita el listado, sin traer la entidad del organismo completa
    const consulta = this.repository
      .createQueryBuilder('cm')
      .innerJoin('cm.cuentaAnual', 'ca')
      .innerJoin('ca.organismo', 'o')
      .select('cm.id', 'id')
      .addSelect('cm.mes', 'mes')
      .addSelect('cm.cuentaAnualId', 'cuentaAnualId')
      .addSelect('cm.estado', 'estado')
      .addSelect('cm.fechaCreacion', 'fechaCreacion')
      .addSelect('ca.organismoId', 'organismoId')
      .addSelect('o.nombre', 'organismoNombre')
      .addSelect('ca.ejercicioFiscal', 'ejercicioFiscal')
      .addSelect('cm.presentadaPorId', 'presentadaPorId')
      .addSelect('cm.presentadaEn', 'presentadaEn')
      .orderBy('cm.id', 'ASC');
    if (filtros?.estado)
      consulta.andWhere('cm.estado = :estado', { estado: filtros.estado });
    if (filtros?.organismoIds)
      consulta.andWhere('ca.organismoId IN (:...organismoIds)', {
        organismoIds: filtros.organismoIds,
      });

    const filas = await consulta.getRawMany<{
      id: number;
      mes: number;
      cuentaAnualId: number;
      estado: EstadoCuentaMensual;
      fechaCreacion: Date;
      organismoId: number;
      organismoNombre: string;
      ejercicioFiscal: number;
      presentadaPorId: number | null;
      presentadaEn: Date | null;
    }>();
    const personas = await cargarResumenesPersona(
      this.repository.manager,
      filas.map((f) => f.presentadaPorId),
    );
    const librosPorCuenta = await this.resumirLibros(filas.map((f) => f.id));
    return filas.map(
      (fila) =>
        new CuentaMensualListada(
          fila.id,
          fila.mes,
          fila.cuentaAnualId,
          fila.estado,
          fila.fechaCreacion,
          fila.organismoId,
          fila.organismoNombre,
          fila.ejercicioFiscal,
          librosPorCuenta.get(fila.id) ?? [],
          fila.presentadaPorId,
          fila.presentadaEn,
          personas.get(fila.presentadaPorId ?? -1) ?? null,
        ),
    );
  }

  //un solo GROUP BY por tipo de libro para todas las cuentas del listado: cuenta las transacciones y toma
  //sus fechas extremas en la base, sin traer las filas (un libro puede tener miles)
  private async resumirLibros(
    cuentaMensualIds: number[],
  ): Promise<Map<number, ResumenLibro[]>> {
    const porCuenta = new Map<number, ResumenLibro[]>();
    if (cuentaMensualIds.length === 0) return porCuenta;

    const [librosBanco, ingresosEgresos] = await Promise.all([
      this.resumirLibrosDe(
        LibroBancoEntity,
        TipoLibro.LIBRO_BANCO,
        cuentaMensualIds,
      ),
      this.resumirLibrosDe(
        IngresosEgresosEntity,
        TipoLibro.INGRESOS_EGRESOS,
        cuentaMensualIds,
      ),
    ]);

    //por cuenta: primero los libros banco y después el de ingresos y egresos, cada grupo por id
    for (const { cuentaMensualId, resumen } of [
      ...librosBanco,
      ...ingresosEgresos,
    ]) {
      porCuenta.set(cuentaMensualId, [
        ...(porCuenta.get(cuentaMensualId) ?? []),
        resumen,
      ]);
    }
    return porCuenta;
  }

  //ambos libros comparten forma (id, cuenta mensual, N° de cuenta y transacciones con fecha)
  private async resumirLibrosDe(
    entidad: typeof LibroBancoEntity | typeof IngresosEgresosEntity,
    tipo: TipoLibro,
    cuentaMensualIds: number[],
  ): Promise<{ cuentaMensualId: number; resumen: ResumenLibro }[]> {
    const filas = await this.repository.manager
      .createQueryBuilder(entidad, 'l')
      .leftJoin('l.transacciones', 't')
      .select('l.id', 'id')
      .addSelect('l.cuentaMensualId', 'cuentaMensualId')
      .addSelect('l.numeroCuentaCte', 'numeroCuentaCte')
      .addSelect('COUNT(t.id)', 'cantidadTransacciones')
      .addSelect('MIN(t.fecha)', 'fechaDesde')
      .addSelect('MAX(t.fecha)', 'fechaHasta')
      .where('l.cuentaMensualId IN (:...cuentaMensualIds)', {
        cuentaMensualIds,
      })
      .groupBy('l.id')
      .orderBy('l.id', 'ASC')
      .getRawMany<{
        id: number;
        cuentaMensualId: number;
        numeroCuentaCte: string | null;
        cantidadTransacciones: string;
        fechaDesde: string | null;
        fechaHasta: string | null;
      }>();

    return filas.map((fila) => ({
      cuentaMensualId: fila.cuentaMensualId,
      resumen: new ResumenLibro(
        fila.id,
        tipo,
        fila.numeroCuentaCte,
        Number(fila.cantidadTransacciones), //COUNT llega como bigint (texto)
        fila.fechaDesde,
        fila.fechaHasta,
      ),
    }));
  }
}
