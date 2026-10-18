import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  INDICE_EMAIL_UNICO,
  UsuarioEntity,
} from '../../../entities/usuario.entity.js';

//crea el indice unico sobre lower(email); idempotente, corre en cada arranque
@Injectable()
export class IndiceEmailUnicoInicializador implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    const tabla = this.dataSource.getMetadata(UsuarioEntity).tableName;
    try {
      await this.dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${INDICE_EMAIL_UNICO}" ON "${tabla}" (lower("email"))`,
      );
    } catch (error) {
      throw new Error(
        `No se pudo crear el índice ${INDICE_EMAIL_UNICO}: probablemente existen usuarios con emails que difieren solo en mayúsculas. ${(error as Error).message}`,
      );
    }
  }
}
