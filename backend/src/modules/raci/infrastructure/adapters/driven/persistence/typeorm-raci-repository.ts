import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { cargarResumenesPersona } from '../../../../../../common/resumen-persona.js';
import { RaciRepositoryPort } from '../../../../application/ports/out/raci-repository.port.js';
import { Raci } from '../../../../domain/entities/raci.domain.js';
import { RaciDuplicadoError } from '../../../../domain/errors/raci-duplicado.error.js';
import { RaciEntity } from '../../../entities/raci.entity.js';
import { TransaccionRaciEntity } from '../../../entities/transaccion-raci.entity.js';
import { RaciMapper } from '../../../mappers/raci.mapper.js';

//nombre de la restricción única (una por cuenta mensual)
const RESTRICCION_UNICA = 'UQ_raci_cuenta_mensual';
const UNIQUE_VIOLATION = '23505';

//cada asiento usa 18 parámetros y Postgres admite 65535 por consulta; el insert en cascada de TypeORM
//mandaría todas las filas juntas, por eso se insertan por lotes
const TAMANO_LOTE = 1000;

@Injectable()
export class TypeOrmRaciRepositoryAdapter implements RaciRepositoryPort {
  constructor(
    @InjectRepository(RaciEntity)
    private readonly repository: Repository<RaciEntity>,
    private readonly dataSource: DataSource,
  ) {}

  //traduce la violación de la restricción única a un error de dominio (dos cargas simultáneas)
  private traducirError(error: unknown, libro: Raci): unknown {
    if (error instanceof QueryFailedError) {
      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === UNIQUE_VIOLATION && constraint === RESTRICCION_UNICA) {
        return new RaciDuplicadoError(libro.cuentaMensualId);
      }
    }
    return error;
  }

  //guarda la cabecera y los asientos por lotes dentro del manager (la transacción) recibido
  private async persistir(manager: EntityManager, libro: Raci): Promise<Raci> {
    const cabecera = await manager.save(RaciMapper.toCabeceraEntity(libro));

    const filas = libro.transacciones.map((t) =>
      RaciMapper.toTransaccionEntity(t, cabecera.id),
    );
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      await manager.insert(
        TransaccionRaciEntity,
        filas.slice(i, i + TAMANO_LOTE),
      );
    }

    //se relee para devolver los ids y la fecha de creación que asignó la base
    const guardado = await manager.findOneOrFail(RaciEntity, {
      where: { id: cabecera.id },
      relations: { transacciones: true },
      order: { transacciones: { id: 'ASC' } },
    });
    return await this.aDominio(manager, guardado);
  }

  //pasa a dominio sumando el nombre de quien subió el libro
  private async aDominio(
    manager: EntityManager,
    entity: RaciEntity,
  ): Promise<Raci> {
    const personas = await cargarResumenesPersona(manager, [
      entity.subidoPorId,
    ]);
    return RaciMapper.toDomain(
      entity,
      personas.get(entity.subidoPorId) ?? null,
    );
  }

  async guardar(libro: Raci): Promise<Raci> {
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
  ): Promise<Raci | null> {
    const entity = await this.repository.findOne({
      where: { cuentaMensualId },
      relations: { transacciones: true },
      //en el orden del archivo (id de inserción): sin ORDER BY Postgres no garantiza ningún orden
      order: { transacciones: { id: 'ASC' } },
    });
    return entity ? await this.aDominio(this.repository.manager, entity) : null;
  }

  async reemplazar(idExistente: number, nuevo: Raci): Promise<Raci> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        //el ON DELETE CASCADE elimina los asientos del libro viejo
        await manager.delete(RaciEntity, { id: idExistente });
        return await this.persistir(manager, nuevo);
      });
    } catch (error) {
      throw this.traducirError(error, nuevo);
    }
  }
}
