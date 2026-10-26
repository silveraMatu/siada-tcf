import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { cargarResumenesPersona } from '../../../../../../common/resumen-persona.js';
import { LibroBancoRepositoryPort } from '../../../../application/ports/out/libro-banco-repository.port.js';
import { LibroBanco } from '../../../../domain/entities/libro-banco.domain.js';
import { LibroBancoDuplicadoError } from '../../../../domain/errors/libro-banco-duplicado.error.js';
import { LibroBancoEntity } from '../../../entities/libro-banco.entity.js';
import { LibroBancoMapper } from '../../../mappers/libro-banco.mapper.js';

//nombre de la restricción única (cuenta mensual + N° de cuenta corriente)
const RESTRICCION_UNICA = 'UQ_libro_banco_cuenta_numero';
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class TypeOrmLibroBancoRepositoryAdapter implements LibroBancoRepositoryPort {
  constructor(
    @InjectRepository(LibroBancoEntity)
    private readonly repository: Repository<LibroBancoEntity>,
    private readonly dataSource: DataSource,
  ) {}

  //traduce la violación de la restricción única a un error de dominio (dos cargas simultáneas del mismo N°)
  private traducirError(error: unknown, libroBanco: LibroBanco): unknown {
    if (error instanceof QueryFailedError) {
      const { code, constraint } = error.driverError as {
        code?: string;
        constraint?: string;
      };
      if (code === UNIQUE_VIOLATION && constraint === RESTRICCION_UNICA) {
        return new LibroBancoDuplicadoError(
          libroBanco.cuentaMensualId,
          libroBanco.numeroCuentaCte ?? '',
        );
      }
    }
    return error;
  }

  async guardar(libroBanco: LibroBanco): Promise<LibroBanco> {
    const entity = LibroBancoMapper.toEntity(libroBanco);
    try {
      const guardado = await this.repository.save(entity);
      return await this.aDominio(this.repository.manager, [guardado]).then(
        ([libro]) => libro,
      );
    } catch (error) {
      throw this.traducirError(error, libroBanco);
    }
  }

  async buscarPorCuentaYNumero(
    cuentaMensualId: number,
    numeroCuentaCte: string,
  ): Promise<LibroBanco | null> {
    const entity = await this.repository.findOne({
      where: { cuentaMensualId, numeroCuentaCte },
      relations: { transacciones: true },
      order: { transacciones: { id: 'ASC' } },
    });
    if (!entity) return null;
    const [libro] = await this.aDominio(this.repository.manager, [entity]);
    return libro;
  }

  async reemplazar(
    idExistente: number,
    nuevo: LibroBanco,
  ): Promise<LibroBanco> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        //el ON DELETE CASCADE elimina las transacciones del libro viejo y las observaciones ligadas a ellas
        await manager.delete(LibroBancoEntity, { id: idExistente });
        const guardado = await manager.save(LibroBancoMapper.toEntity(nuevo));
        const [libro] = await this.aDominio(manager, [guardado]);
        return libro;
      });
    } catch (error) {
      throw this.traducirError(error, nuevo);
    }
  }

  async buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<LibroBanco[]> {
    const entities = await this.repository.find({
      where: { cuentaMensualId },
      relations: {
        transacciones: true,
      },
      //las transacciones en el orden del archivo (id de inserción): sin ORDER BY Postgres las devuelve
      //en el orden físico de las filas, que cambia, por ejemplo, tras reemplazar un libro
      order: { id: 'ASC', transacciones: { id: 'ASC' } },
    });

    return await this.aDominio(this.repository.manager, entities);
  }

  //pasa a dominio sumando el nombre de quien subió cada libro (una sola consulta para todos)
  private async aDominio(
    manager: EntityManager,
    entities: LibroBancoEntity[],
  ): Promise<LibroBanco[]> {
    const personas = await cargarResumenesPersona(
      manager,
      entities.map((e) => e.subidoPorId),
    );
    return entities.map((entity) =>
      LibroBancoMapper.toDomain(
        entity,
        personas.get(entity.subidoPorId) ?? null,
      ),
    );
  }
}
