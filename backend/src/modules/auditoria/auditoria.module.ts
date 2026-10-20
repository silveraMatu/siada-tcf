import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionEntity } from './infrastructure/entities/observaciones.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ObservacionEntity])],
})
export class AuditoriaModule {}
