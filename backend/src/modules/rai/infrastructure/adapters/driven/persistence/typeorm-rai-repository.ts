import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { cargarResumenesPersona } from '../../../../../../common/resumen-persona.js';
import { RaiRepositoryPort } from '../../../../application/ports/out/rai-repository.port.js';
import { Rai } from '../../../../domain/entities/rai.domain.js';
import { RaiDuplicadoError } from '../../../../domain/errors/rai-duplicado.error.js';
import { RaiEntity } from '../../../entities/rai.entity.js';
import { TransaccionRaiEntity } from '../../../entities/transaccion-rai.entity.js';
import { RaiMapper } from '../../../mappers/rai.mapper.js';

//nombre de la restricción única (una por cuenta mensual)
const RESTRICCION_UNICA = 'UQ_rai_cuenta_mensual';
const UNIQUE_VIOLATION = '23505';

//cada asiento usa 10 parámetros y Postgres admite 65535 por consulta; el insert en cascada de TypeORM
//mandaría todas las filas juntas, por eso se insertan por lotes
const TAMANO_LOTE = 1000;

@Injectable()
export class TypeOrmRaiRepositoryAdapter implements RaiRepositoryPort {
  constructor(
    @InjectRepository(RaiEntity)
    private readonly repository: Repository<RaiEntity>,
    private readonly dataSource: DataSource,
  ) {}

  //traduce la violación de la restricción única a un error de dominio (dos cargas simultáneas)
  private traducirError(error: unknown, libro: Rai): unknown {
    if (error instanceof QueryFailedError) {
      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === UNIQUE_VIOLATION && constraint === RESTRICCION_UNICA) {
        return new RaiDuplicadoError(libro.cuentaMensualId);
      }
    }
    return error;
  }

  //guarda la cabecera y los asientos por lotes dentro del manager (la transacción) recibido
  private async persistir(manager: EntityManager, libro: Rai): Promise<Rai> {
    const cabecera = await manager.save(RaiMapper.toCabeceraEntity(libro));

    const filas = libro.transacciones.map((t) =>
      RaiMapper.toTransaccionEntity(t, cabecera.id),
    );
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      await manager.insert(
        TransaccionRaiEntity,
        filas.slice(i, i + TAMANO_LOTE),
      );
    }

    //se relee para devolver los ids y la fecha de creación que asignó la base
    const guardado = await manager.findOneOrFail(RaiEntity, {
      where: { id: cabecera.id },
      relations: { transacciones: true },
      order: { transacciones: { id: 'ASC' } },
    });
    return await this.aDominio(manager, guardado);
  }

  //pasa a dominio sumando el nombre de quien subió el libro
  private async aDominio(
    manager: EntityManager,
    entity: RaiEntity,
  ): Promise<Rai> {
    const personas = await cargarResumenesPersona(manager, [
      entity.subidoPorId,
    ]);
    return RaiMapper.toDomain(entity, personas.get(entity.subidoPorId) ?? null);
  }

  async guardar(libro: Rai): Promise<Rai> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.persistir(manager, libro),
      );
    } catch (error) {
      throw this.traducirError(error, libro);
    }
  }

  async buscarPorCuentaMensualId(cuentaMensualId: number): Promise<Rai | null> {
    const entity = await this.repository.findOne({
      where: { cuentaMensualId },
      relations: { transacciones: true },
      //en el orden del archivo (id de inserción): sin ORDER BY Postgres no garantiza ningún orden
      order: { transacciones: { id: 'ASC' } },
    });
    return entity ? await this.aDominio(this.repository.manager, entity) : null;
  }

  async reemplazar(idExistente: number, nuevo: Rai): Promise<Rai> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        //el ON DELETE CASCADE elimina los asientos del libro viejo
        await manager.delete(RaiEntity, { id: idExistente });
        return await this.persistir(manager, nuevo);
      });
    } catch (error) {
      throw this.traducirError(error, nuevo);
    }
  }
}
