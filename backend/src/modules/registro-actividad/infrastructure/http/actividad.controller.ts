import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/jwt-auth.guard.js';
import { Roles } from '../../../auth/infrastructure/security/roles.decorator.js';
import { RolesGuard } from '../../../auth/infrastructure/security/roles.guard.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ExportarActividadUseCase } from '../../application/use-cases/exportar-actividad.use-case.js';
import { ListarActividadUseCase } from '../../application/use-cases/listar-actividad.use-case.js';
import type { EventoActividad } from '../../domain/entities/evento-actividad.domain.js';
import { AccionActividad } from '../../domain/enums/accion-actividad.enum.js';
import {
  ExportarActividadQueryDto,
  ListarActividadQueryDto,
} from './dto/listar-actividad-query.dto.js';
import {
  PaginaActividadResponseDto,
  type EventoActividadResponseSchema,
} from './dto/actividad-response.dto.js';
import { Registrar } from './registrar.decorator.js';
import type { z } from 'zod';

const aRespuesta = (
  e: EventoActividad,
): z.infer<typeof EventoActividadResponseSchema> => ({
  id: e.id!,
  ocurridoEn: e.ocurridoEn.toISOString(),
  accion: e.accion,
  resultado: e.resultado,
  codigoHttp: e.codigoHttp,
  usuarioId: e.actor?.usuarioId ?? null,
  nombre: e.actor?.nombre ?? null,
  apellido: e.actor?.apellido ?? null,
  dni: e.actor?.dni ?? null,
  roles: e.actor?.roles ?? [],
  ip: e.ip,
  userAgent: e.userAgent,
  requestId: e.requestId,
  entidadTipo: e.entidadTipo,
  entidadId: e.entidadId,
  organismoId: e.organismoId,
  cuentaMensualId: e.cuentaMensualId,
  detalle: e.detalle,
});

@ApiTags('Actividad')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({ description: 'Requiere el rol SUPERVISOR' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERVISOR)
@Controller('actividad')
export class ActividadController {
  constructor(
    private readonly listarActividadUseCase: ListarActividadUseCase,
    private readonly exportarActividadUseCase: ExportarActividadUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar la bitácora de actividad',
    description:
      'Del evento más reciente al más antiguo, con filtros opcionales. Paginación por cursor: se pide la página siguiente con `cursor=siguienteCursor`.',
  })
  @ApiResponse({ status: 200, type: PaginaActividadResponseDto })
  @ApiResponse({ status: 400, description: 'Filtros inválidos' })
  async listar(
    @Query() { limite, cursor, ...filtros }: ListarActividadQueryDto,
  ): Promise<PaginaActividadResponseDto> {
    const pagina = await this.listarActividadUseCase.execute(
      filtros,
      limite,
      cursor,
    );
    return {
      eventos: pagina.eventos.map(aRespuesta),
      siguienteCursor: pagina.siguienteCursor,
    };
  }

  @Get('exportar')
  @Registrar(AccionActividad.ACTIVIDAD_EXPORTADA)
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="actividad.csv"')
  @ApiOperation({
    summary: 'Exportar la bitácora a CSV',
    description:
      'Mismos filtros que el listado, sin paginación (hasta 50.000 filas). La exportación queda registrada en la bitácora.',
  })
  @ApiResponse({ status: 200, description: 'Archivo CSV' })
  @ApiResponse({ status: 400, description: 'Filtros inválidos' })
  async exportar(@Query() filtros: ExportarActividadQueryDto): Promise<string> {
    return await this.exportarActividadUseCase.execute(filtros);
  }
}
