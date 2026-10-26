import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { cargarResumenesPersona } from '../../../../../../common/resumen-persona.js';
import { IngresosEgresosRepositoryPort } from '../../../../application/ports/out/ingresos-egresos-repository.port.js';
import { IngresosEgresos } from '../../../../domain/entities/ingresos-egresos.domain.js';
import { IngresosEgresosDuplicadoError } from '../../../../domain/errors/ingresos-egresos-duplicado.error.js';
import { IngresosEgresosEntity } from '../../../entities/ingresos-egresos.entity.js';
import { TransaccionIngresoEgresoEntity } from '../../../entities/transaccion-ingreso-egreso.entity.js';
import { IngresosEgresosMapper } from '../../../mappers/ingresos-egresos.mapper.js';

//nombre de la restricción única (una por cuenta mensual)
const RESTRICCION_UNICA = 'UQ_ingresos_egresos_cuenta_mensual';
const UNIQUE_VIOLATION = '23505';

//cada fila usa 22 parámetros y Postgres admite 65535 por consulta; el insert en cascada de TypeORM
//mandaría todas las filas juntas y falla con unas 3000, por eso se insertan por lotes
const TAMANO_LOTE = 1000;

@Injectable()
export class TypeOrmIngresosEgresosRepositoryAdapter implements IngresosEgresosRepositoryPort {
  constructor(
    @InjectRepository(IngresosEgresosEntity)
    private readonly repository: Repository<IngresosEgresosEntity>,
    private readonly dataSource: DataSource,
  ) {}

  //traduce la violación de la restricción única a un error de dominio (dos cargas simultáneas)
  private traducirError(error: unknown, libro: IngresosEgresos): unknown {
    if (error instanceof QueryFailedError) {
      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === UNIQUE_VIOLATION && constraint === RESTRICCION_UNICA) {
        return new IngresosEgresosDuplicadoError(libro.cuentaMensualId);
      }
    }
    return error;
  }

  //guarda la cabecera y las filas por lotes dentro del manager (la transacción) recibido
  private async persistir(
    manager: EntityManager,
    libro: IngresosEgresos,
  ): Promise<IngresosEgresos> {
    const cabecera = await manager.save(
      IngresosEgresosMapper.toCabeceraEntity(libro),
    );

    const filas = libro.transacciones.map((t) =>
      IngresosEgresosMapper.toTransaccionEntity(t, cabecera.id),
    );
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      await manager.insert(
        TransaccionIngresoEgresoEntity,
        filas.slice(i, i + TAMANO_LOTE),
      );
    }

    //se relee para devolver los ids y la fecha de creación que asignó la base
    const guardado = await manager.findOneOrFail(IngresosEgresosEntity, {
      where: { id: cabecera.id },
      relations: { transacciones: true },
      order: { transacciones: { id: 'ASC' } },
    });
    return await this.aDominio(manager, guardado);
  }

  //pasa a dominio sumando el nombre de quien subió el libro
  private async aDominio(
    manager: EntityManager,
    entity: IngresosEgresosEntity,
  ): Promise<IngresosEgresos> {
    const personas = await cargarResumenesPersona(manager, [
      entity.subidoPorId,
    ]);
    return IngresosEgresosMapper.toDomain(
      entity,
      personas.get(entity.subidoPorId) ?? null,
    );
  }

  async guardar(libro: IngresosEgresos): Promise<IngresosEgresos> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.persistir(manager, libro),
      );
    } catch (error) {
      throw this.traducirError(error, libro);
    }
  }

  async buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<IngresosEgresos | null> {
    const entity = await this.repository.findOne({
      where: { cuentaMensualId },
      relations: { transacciones: true },
      //en el orden del archivo (id de inserción): sin ORDER BY Postgres no garantiza ningún orden
      order: { transacciones: { id: 'ASC' } },
    });
    return entity ? await this.aDominio(this.repository.manager, entity) : null;
  }

  async reemplazar(
    idExistente: number,
    nuevo: IngresosEgresos,
  ): Promise<IngresosEgresos> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        //el ON DELETE CASCADE elimina las transacciones del libro viejo
        await manager.delete(IngresosEgresosEntity, { id: idExistente });
        return await this.persistir(manager, nuevo);
      });
    } catch (error) {
      throw this.traducirError(error, nuevo);
    }
  }
}
