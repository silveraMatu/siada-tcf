import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { Raci } from '../../domain/entities/raci.domain.js';
import { TransaccionRaci } from '../../domain/entities/transaccion-raci.domain.js';
import { RaciDuplicadoError } from '../../domain/errors/raci-duplicado.error.js';
import { RaciRepositoryPort } from '../ports/out/raci-repository.port.js';
import { calcularHashContenido } from '../../../../common/hash-contenido.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

//asiento del comando, independiente del DTO HTTP; los textos opcionales pueden venir vacíos
export interface TransaccionRaciComando {
  asiento: number;
  fecha: string;
  expediente?: string;
  concepto: string;
  compromisoInstrumentoLegal?: string;
  compromisoDelMes: number;
  compromisoAcumulado: number;
  compromisoOrdenProvision?: string;
  devengadoDelMes: number;
  devengadoAcumulado: number;
  devengadoSaldo: number;
  devengadoOrdenPago?: string;
  pagoNumeroCheque?: string;
  pagoDelMes: number;
  pagoAcumulado: number;
  pagoSaldoAPagar: number;
}

export interface IngestarRaciComando {
  //si la cuenta ya tiene el libro: false lo rechaza (409), true lo reemplaza
  reemplazar?: boolean;
  transacciones: TransaccionRaciComando[];
}

//mismo código estable que usan los otros libros: el frontend ofrece reemplazar el libro
export const CODIGO_LIBRO_DUPLICADO = 'LIBRO_DUPLICADO';

//un texto en blanco es lo mismo que ningún texto
const textoOpcional = (texto?: string): string | null =>
  texto && texto.trim() !== '' ? texto : null;

@Injectable()
export class IngestarRaciUseCase {
  constructor(
    private readonly raciRepository: RaciRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    comando: IngestarRaciComando,
    usuarioId: number,
  ): Promise<Raci> {
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
        new TransaccionRaci({
          ...t,
          expediente: textoOpcional(t.expediente),
          compromisoInstrumentoLegal: textoOpcional(
            t.compromisoInstrumentoLegal,
          ),
          compromisoOrdenProvision: textoOpcional(t.compromisoOrdenProvision),
          devengadoOrdenPago: textoOpcional(t.devengadoOrdenPago),
          pagoNumeroCheque: textoOpcional(t.pagoNumeroCheque),
        }),
    );
    //todos los campos de cada asiento, en el orden de las columnas de la planilla
    const hashContenido = calcularHashContenido([
      transacciones.map((t) => [
        t.asiento,
        t.fecha,
        t.expediente,
        t.concepto,
        t.compromisoInstrumentoLegal,
        t.compromisoDelMes,
        t.compromisoAcumulado,
        t.compromisoOrdenProvision,
        t.devengadoDelMes,
        t.devengadoAcumulado,
        t.devengadoSaldo,
        t.devengadoOrdenPago,
        t.pagoNumeroCheque,
        t.pagoDelMes,
        t.pagoAcumulado,
        t.pagoSaldoAPagar,
      ]),
    ]);
    this.actividad.detalle({ hashContenido });

    const libro = new Raci(
      cuentaMensualId,
      transacciones,
      undefined,
      undefined,
      usuarioId,
      hashContenido,
    );

    //un solo libro por rendición: si ya hay uno se rechaza o se reemplaza
    const existente =
      await this.raciRepository.buscarPorCuentaMensualId(cuentaMensualId);

    try {
      if (!existente) {
        return await this.raciRepository.guardar(libro);
      }
      if (!comando.reemplazar) {
        throw this.conflictoDuplicado(existente);
      }
      return await this.raciRepository.reemplazar(existente.id!, libro);
    } catch (error) {
      //dos cargas simultáneas: la restricción única frenó a la segunda
      if (error instanceof RaciDuplicadoError) {
        const ganador =
          await this.raciRepository.buscarPorCuentaMensualId(cuentaMensualId);
        throw ganador ? this.conflictoDuplicado(ganador) : error;
      }
      throw error;
    }
  }

  private conflictoDuplicado(existente: Raci): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'Ya existe un libro RACI en esta rendición.',
      codigo: CODIGO_LIBRO_DUPLICADO,
      libroExistente: {
        id: existente.id,
        //el RACI no tiene cuenta corriente; se mantiene el campo para que el contrato del 409 sea el de los otros libros
        numeroCuentaCte: null,
        fechaCreacion: existente.fechaCreacion?.toISOString() ?? null,
        cantidadTransacciones: existente.transacciones.length,
      },
    });
  }
}
