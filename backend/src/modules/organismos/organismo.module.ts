import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismoEntity } from './infrastructure/entities/organismo.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganismoEntity]),
  ],
  exports: [TypeOrmModule],
})
export class OrganismosModule {}