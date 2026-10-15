import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaMensualRepositoryPort } from '../../../../application/ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensualEntity } from '../../../entities/cuenta-mensual.entity.js';

@Injectable()
export class TypeOrmCuentaMensualRepositoryAdapter implements CuentaMensualRepositoryPort {
  constructor(
    @InjectRepository(CuentaMensualEntity)
    private readonly repository: Repository<CuentaMensualEntity>,
  ) {}

  async existe(id: number): Promise<boolean> {
    return await this.repository.exists({ where: { id } });
  }
}
