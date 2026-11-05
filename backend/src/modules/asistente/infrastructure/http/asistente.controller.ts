import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
import { UsuarioActual } from '../../../auth/infrastructure/security/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../auth/infrastructure/security/usuario-autenticado.js';
import { AccionActividad } from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ConsultarAsistenteUseCase } from '../../application/use-cases/consultar-asistente.use-case.js';
import { ConsultarAsistenteDto } from './dto/consultar-asistente.dto.js';
import { RespuestaAsistenteDto } from './dto/respuesta-asistente.dto.js';

@ApiTags('Asistente')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({
  description:
    'Requiere el rol ADMIN o AUDITOR, y que el organismo esté asignado al auditor',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.AUDITOR)
@Controller('asistente')
export class AsistenteController {
  constructor(
    private readonly consultarAsistenteUseCase: ConsultarAsistenteUseCase,
  ) {}

  @Post('consultas')
  @Registrar(AccionActividad.CONSULTA_IA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preguntarle al copiloto de IA sobre un organismo',
    description:
      'El copiloto responde con los datos del organismo (consultas SQL de solo lectura limitadas a ese organismo). `organismoId` es opcional: si falta se usa el único organismo asignado al auditor; si no tiene ninguno, el copiloto responde que no está auditando ningún organismo. `cuentaMensualId` ancla la consulta a una rendición del organismo. Cada consulta es independiente (sin historial).',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta del copiloto',
    type: RespuestaAsistenteDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, o el auditor tiene más de un organismo y no indicó cuál',
  })
  @ApiResponse({
    status: 404,
    description:
      'El organismo no existe, o la cuenta mensual no es de ese organismo',
  })
  @ApiResponse({
    status: 502,
    description: 'El servicio de IA no está disponible',
  })
  @ApiResponse({ status: 503, description: 'El asistente no está configurado' })
  async consultar(
    @Body() dto: ConsultarAsistenteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RespuestaAsistenteDto> {
    return this.consultarAsistenteUseCase.execute({
      actor: { usuarioId: usuario.id, roles: usuario.roles },
      pregunta: dto.pregunta,
      organismoId: dto.organismoId,
      cuentaMensualId: dto.cuentaMensualId,
    });
  }
}
