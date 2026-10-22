import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../domain/entities/transaccion-libro-banco.domain.js';
import { LibroBancoDuplicadoError } from '../../domain/errors/libro-banco-duplicado.error.js';

//entrada del caso de uso, independiente del DTO HTTP
export interface IngestarLibroBancoComando {
  numeroCuentaCte: string;
  //si ya hay un libro con ese N° de cuenta: false lo rechaza (409), true lo reemplaza
  reemplazar?: boolean;
  transacciones: {
    fecha?: string;
    cheque?: string;
    aLaOrdenDe: string;
    depositos: number;
    retiro: number;
    saldo: number;
  }[];
}

//código estable que el frontend usa para ofrecer reemplazar el libro
export const CODIGO_LIBRO_DUPLICADO = 'LIBRO_DUPLICADO';

@Injectable()
export class IngestarLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
  ) {}

  async execute(
    cuentaMensualId: number,
    comando: IngestarLibroBancoComando,
    usuarioId: number,
  ): Promise<LibroBanco> {
    //validamos existencia de la cuenta mensual
    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    //solo el responsable del organismo dueño de la cuenta puede cargar su evidencia
    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (
      !(await this.responsableDelOrganismo.esResponsableDelOrganismo(
        usuarioId,
        organismoId,
      ))
    ) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece al organismo del responsable.',
      );
    }

    //candado: una cuenta ya enviada a auditoría no admite cambios en su evidencia
    if (!cuenta.estaEnBorrador()) {
      throw new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
    }

    //mapping del comando a la entidad de dominio
    const transaccionesDomain = comando.transacciones.map(
      (t) =>
        new TransaccionLibroBanco(
          t.fecha ?? null,
          t.cheque ?? null,
          t.aLaOrdenDe,
          t.depositos,
          t.retiro,
          t.saldo,
        ),
    );

    const libroBancoDomain = new LibroBanco(
      cuentaMensualId,
      comando.numeroCuentaCte,
      transaccionesDomain,
    );

    //un solo libro por cuenta corriente en la rendición: otro N° convive, el mismo se reemplaza o se rechaza
    const existente = await this.libroBancoRepository.buscarPorCuentaYNumero(
      cuentaMensualId,
      comando.numeroCuentaCte,
    );

    try {
      if (!existente) {
        return await this.libroBancoRepository.guardar(libroBancoDomain);
      }
      if (!comando.reemplazar) {
        throw this.conflictoDuplicado(existente);
      }
      return await this.libroBancoRepository.reemplazar(
        existente.id!,
        libroBancoDomain,
      );
    } catch (error) {
      //dos cargas simultáneas del mismo N°: la restricción única frenó a la segunda
      if (error instanceof LibroBancoDuplicadoError) {
        const ganador = await this.libroBancoRepository.buscarPorCuentaYNumero(
          cuentaMensualId,
          comando.numeroCuentaCte,
        );
        throw ganador ? this.conflictoDuplicado(ganador) : error;
      }
      throw error;
    }
  }

  private conflictoDuplicado(existente: LibroBanco): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: `Ya existe un libro para la cuenta corriente ${existente.numeroCuentaCte} en esta rendición.`,
      codigo: CODIGO_LIBRO_DUPLICADO,
      libroExistente: {
        id: existente.id,
        numeroCuentaCte: existente.numeroCuentaCte,
        fechaCreacion: existente.fechaCreacion?.toISOString() ?? null,
        cantidadTransacciones: existente.transacciones.length,
      },
    });
  }
}
