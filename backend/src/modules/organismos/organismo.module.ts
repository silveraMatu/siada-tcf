import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismoEntity } from './infrastructure/entities/organismo.entity.js';
import { OrganismoRepositoryPort } from './application/ports/out/organismo-repository.port.js';
import { TypeOrmOrganismoRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-organismo.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganismoEntity]),
  ],
  providers: [
    {
      provide: OrganismoRepositoryPort,
      useClass: TypeOrmOrganismoRepositoryAdapter,
    },
  ],
  exports: [TypeOrmModule, OrganismoRepositoryPort],
})
export class OrganismosModule {}
