import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { LibroBancoParamsDto } from './dto/libro-banco-params.dto.js';
import { UploadLibroBancoDto } from './dto/upload-libro-banco.dto.js';
import { LibroBancoResponseDto } from './dto/libro-banco-response.dto.js';
import { IngestarLibroBancoUseCase } from '../../application/use-cases/ingestar-libro-banco.use-case.js';
import { ObtenerLibroBancoUseCase } from '../../application/use-cases/obtener-libro-banco.use-case.js';
import type { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('Libro Banco')
@Controller('cuentas-mensuales/:cuentaMensualId/libro-banco')
export class LibroBancoController {
  constructor(
    private readonly ingestarLibroBancoUseCase: IngestarLibroBancoUseCase,
    private readonly obtenerLibroBancoUseCase: ObtenerLibroBancoUseCase,
  ) {}

  private toResponse(libro: LibroBanco): LibroBancoResponseDto {
    return {
      id: libro.id!,
      cuentaMensualId: libro.cuentaMensualId,
      numeroCuentaCte: libro.numeroCuentaCte,
      fechaCreacion: libro.fechaCreacion!.toISOString(),
      subidoPorId: libro.subidoPorId!,
      subidoPor: libro.subidoPor ?? null,
      hashContenido: libro.hashContenido!,
      transacciones: libro.transacciones.map((t) => ({
        id: t.id!,
        fecha: t.fecha,
        cheque: t.cheque,
        aLaOrdenDe: t.aLaOrdenDe,
        depositos: t.depositos,
        retiro: t.retiro,
        saldo: t.saldo,
      })),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description:
      'Requiere el rol RESPONSABLE y que la cuenta sea de su organismo',
  })
  @Registrar(AccionActividad.LIBRO_BANCO_CARGADO, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  //documentación para swagger
  @ApiOperation({
    summary: 'Ingestar y persistir las transacciones del Libro Banco',
    description:
      'Solo puede haber un libro por N° de cuenta corriente en cada rendición. Con otro N° el libro se suma a los ya cargados; con el mismo N° responde 409 (codigo LIBRO_DUPLICADO) salvo que se envíe reemplazar=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Libro Banco e historia de transacciones persistidas',
    type: LibroBancoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description:
      'La cuenta ya fue enviada a auditoría, o ya hay un libro con ese N° de cuenta corriente (codigo LIBRO_DUPLICADO)',
  })
  async ingestar(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
    @Body() dto: UploadLibroBancoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<LibroBancoResponseDto> {
    const libro = await this.ingestarLibroBancoUseCase.execute(
      cuentaMensualId,
      dto,
      usuario.id,
    );
    return this.toResponse(libro);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE, Rol.ADMIN, Rol.AUDITOR)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description:
      'Requiere el rol RESPONSABLE (solo de su organismo), ADMIN o AUDITOR',
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Obtener los Libros Banco (uno por cuenta bancaria) y sus transacciones por ID de Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description:
      'Libros Banco recuperados exitosamente (lista vacía si no hay ninguno cargado)',
    type: [LibroBancoResponseDto],
  })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<LibroBancoResponseDto[]> {
    //ADMIN ve todo; un AUDITOR, los organismos que tiene asignados; un RESPONSABLE, el suyo
    const libros = await this.obtenerLibroBancoUseCase.execute(
      cuentaMensualId,
      {
        usuarioId: usuario.id,
        roles: usuario.roles,
      },
    );
    return libros.map((libro) => this.toResponse(libro));
  }
}
