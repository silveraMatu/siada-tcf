import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RegistroActividadRepositoryPort,
  type FiltrosActividad,
  type PaginaActividad,
} from '../../../../application/ports/out/registro-actividad-repository.port.js';
import type { EventoActividad } from '../../../../domain/entities/evento-actividad.domain.js';
import { RegistroActividadEntity } from '../../../entities/registro-actividad.entity.js';
import { RegistroActividadMapper } from '../../../mappers/registro-actividad.mapper.js';

@Injectable()
export class TypeOrmRegistroActividadRepositoryAdapter implements RegistroActividadRepositoryPort {
  constructor(
    @InjectRepository(RegistroActividadEntity)
    private readonly repository: Repository<RegistroActividadEntity>,
  ) {}

  async guardar(evento: EventoActividad): Promise<void> {
    await this.repository.save(RegistroActividadMapper.toEntity(evento));
  }

  async listar(
    filtros: FiltrosActividad,
    limite: number,
    cursor?: number,
  ): Promise<PaginaActividad> {
    const consulta = this.repository.createQueryBuilder('r');

    //cada filtro es opcional y va parametrizado
    if (cursor !== undefined) consulta.andWhere('r.id < :cursor', { cursor });
    if (filtros.desde)
      consulta.andWhere('r.ocurridoEn >= :desde', { desde: filtros.desde });
    if (filtros.hasta)
      consulta.andWhere('r.ocurridoEn <= :hasta', { hasta: filtros.hasta });
    if (filtros.usuarioId !== undefined)
      consulta.andWhere('r.usuarioId = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    if (filtros.dni) consulta.andWhere('r.dni = :dni', { dni: filtros.dni });
    if (filtros.accion)
      consulta.andWhere('r.accion = :accion', { accion: filtros.accion });
    if (filtros.resultado)
      consulta.andWhere('r.resultado = :resultado', {
        resultado: filtros.resultado,
      });
    if (filtros.organismoId !== undefined)
      consulta.andWhere('r.organismoId = :organismoId', {
        organismoId: filtros.organismoId,
      });
    if (filtros.cuentaMensualId !== undefined)
      consulta.andWhere('r.cuentaMensualId = :cuentaMensualId', {
        cuentaMensualId: filtros.cuentaMensualId,
      });
    if (filtros.entidadTipo)
      consulta.andWhere('r.entidadTipo = :entidadTipo', {
        entidadTipo: filtros.entidadTipo,
      });
    if (filtros.entidadId !== undefined)
      consulta.andWhere('r.entidadId = :entidadId', {
        entidadId: filtros.entidadId,
      });

    //se piden limite + 1 para saber si hay otra página sin contar todo
    const entities = await consulta
      .orderBy('r.id', 'DESC')
      .take(limite + 1)
      .getMany();

    const hayMas = entities.length > limite;
    const pagina = hayMas ? entities.slice(0, limite) : entities;
    const eventos = pagina.map((e) => RegistroActividadMapper.toDomain(e));
    return {
      eventos,
      siguienteCursor: hayMas ? (eventos.at(-1)?.id ?? null) : null,
    };
  }
}
