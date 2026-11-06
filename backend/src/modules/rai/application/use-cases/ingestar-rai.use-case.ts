import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { Rai } from '../../domain/entities/rai.domain.js';
import { TransaccionRai } from '../../domain/entities/transaccion-rai.domain.js';
import { RaiDuplicadoError } from '../../domain/errors/rai-duplicado.error.js';
import { RaiRepositoryPort } from '../ports/out/rai-repository.port.js';
import { calcularHashContenido } from '../../../../common/hash-contenido.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

//asiento del comando, independiente del DTO HTTP; los textos opcionales pueden venir vacíos
export interface TransaccionRaiComando {
  asiento?: number;
  fecha: string;
  planillaNumero?: string;
  concepto: string;
  ingresosDiarios: number;
  ingresosMensuales: number;
  ingresosAcumulados: number;
  saldo: number;
}

export interface IngestarRaiComando {
  //si la cuenta ya tiene el libro: false lo rechaza (409), true lo reemplaza
  reemplazar?: boolean;
  transacciones: TransaccionRaiComando[];
}

//mismo código estable que usan los otros libros: el frontend ofrece reemplazar el libro
export const CODIGO_LIBRO_DUPLICADO = 'LIBRO_DUPLICADO';

//un texto en blanco es lo mismo que ningún texto
const textoOpcional = (texto?: string): string | null =>
  texto && texto.trim() !== '' ? texto : null;

@Injectable()
export class IngestarRaiUseCase {
  constructor(
    private readonly raiRepository: RaiRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    comando: IngestarRaiComando,
    usuarioId: number,
  ): Promise<Rai> {
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

    if (organismoId !== null) this.actividad.organismo(organismoId);
    this.actividad.detalle({
      filas: comando.transacciones.length,
      reemplazoSolicitado: comando.reemplazar ?? false,
    });

    //candado: una cuenta ya enviada a auditoría no admite cambios en su evidencia
    if (!cuenta.estaEnBorrador()) {
      throw new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
    }

    const transacciones = comando.transacciones.map(
      (t) =>
        new TransaccionRai({
          ...t,
          asiento: t.asiento ?? null,
          planillaNumero: textoOpcional(t.planillaNumero),
        }),
    );
    //todos los campos de cada asiento, en el orden de las columnas de la planilla
    const hashContenido = calcularHashContenido([
      transacciones.map((t) => [
        t.asiento,
        t.fecha,
        t.planillaNumero,
        t.concepto,
        t.ingresosDiarios,
        t.ingresosMensuales,
        t.ingresosAcumulados,
        t.saldo,
      ]),
    ]);
    this.actividad.detalle({ hashContenido });

    const libro = new Rai(
      cuentaMensualId,
      transacciones,
      undefined,
      undefined,
      usuarioId,
      hashContenido,
    );

    //un solo libro por rendición: si ya hay uno se rechaza o se reemplaza
    const existente =
      await this.raiRepository.buscarPorCuentaMensualId(cuentaMensualId);

    try {
      if (!existente) {
        return await this.raiRepository.guardar(libro);
      }
      if (!comando.reemplazar) {
        throw this.conflictoDuplicado(existente);
      }
      return await this.raiRepository.reemplazar(existente.id!, libro);
    } catch (error) {
      //dos cargas simultáneas: la restricción única frenó a la segunda
      if (error instanceof RaiDuplicadoError) {
        const ganador =
          await this.raiRepository.buscarPorCuentaMensualId(cuentaMensualId);
        throw ganador ? this.conflictoDuplicado(ganador) : error;
      }
      throw error;
    }
  }

  private conflictoDuplicado(existente: Rai): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'Ya existe un libro RAI en esta rendición.',
      codigo: CODIGO_LIBRO_DUPLICADO,
      libroExistente: {
        id: existente.id,
        //el RAI no tiene cuenta corriente; se mantiene el campo para que el contrato del 409 sea el de los otros libros
        numeroCuentaCte: null,
        fechaCreacion: existente.fechaCreacion?.toISOString() ?? null,
        cantidadTransacciones: existente.transacciones.length,
      },
    });
  }
}
