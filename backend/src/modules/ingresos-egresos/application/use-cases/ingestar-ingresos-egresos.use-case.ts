import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../domain/entities/transaccion-ingreso-egreso.domain.js';
import { IngresosEgresosDuplicadoError } from '../../domain/errors/ingresos-egresos-duplicado.error.js';
import { IngresosEgresosRepositoryPort } from '../ports/out/ingresos-egresos-repository.port.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

//fila del comando, independiente del DTO HTTP; los textos opcionales pueden venir vacíos
export interface TransaccionIngresoEgresoComando {
  fila: number;
  fecha: string;
  concepto: string;
  cheque?: string;
  comprobante?: string;
  cajaDebe: number;
  cajaHaber: number;
  cajaSaldo: number;
  bancoDebe: number;
  bancoHaber: number;
  bancoSaldo: number;
  egresoInc1: number;
  egresoInc2: number;
  egresoInc3: number;
  egresoInc4: number;
  egresoInc5: number;
  ingresoMunicipal: number;
  ingresoOtras: number;
  cuentasVariasConcepto?: string;
  cuentasVariasDebe: number;
  cuentasVariasHaber: number;
}

export interface IngestarIngresosEgresosComando {
  numeroCuentaCte?: string;
  //si la cuenta ya tiene el libro: false lo rechaza (409), true lo reemplaza
  reemplazar?: boolean;
  transacciones: TransaccionIngresoEgresoComando[];
}

//mismo código estable que usa libro banco: el frontend ofrece reemplazar el libro
export const CODIGO_LIBRO_DUPLICADO = 'LIBRO_DUPLICADO';

//un texto en blanco es lo mismo que ningún texto
const textoOpcional = (texto?: string): string | null =>
  texto && texto.trim() !== '' ? texto : null;

@Injectable()
export class IngestarIngresosEgresosUseCase {
  constructor(
    private readonly ingresosEgresosRepository: IngresosEgresosRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    comando: IngestarIngresosEgresosComando,
    usuarioId: number,
  ): Promise<IngresosEgresos> {
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
      numeroCuentaCte: comando.numeroCuentaCte ?? null,
      filas: comando.transacciones.length,
      reemplazoSolicitado: comando.reemplazar ?? false,
    });

    //candado: una cuenta ya enviada a auditoría no admite cambios en su evidencia
    if (!cuenta.estaEnBorrador()) {
      throw new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
    }

    const libro = new IngresosEgresos(
      cuentaMensualId,
      textoOpcional(comando.numeroCuentaCte),
      comando.transacciones.map(
        (t) =>
          new TransaccionIngresoEgreso({
            ...t,
            cheque: textoOpcional(t.cheque),
            comprobante: textoOpcional(t.comprobante),
            cuentasVariasConcepto: textoOpcional(t.cuentasVariasConcepto),
          }),
      ),
    );

    //un solo libro por rendición: si ya hay uno se rechaza o se reemplaza
    const existente =
      await this.ingresosEgresosRepository.buscarPorCuentaMensualId(
        cuentaMensualId,
      );

    try {
      if (!existente) {
        return await this.ingresosEgresosRepository.guardar(libro);
      }
      if (!comando.reemplazar) {
        throw this.conflictoDuplicado(existente);
      }
      return await this.ingresosEgresosRepository.reemplazar(
        existente.id!,
        libro,
      );
    } catch (error) {
      //dos cargas simultáneas: la restricción única frenó a la segunda
      if (error instanceof IngresosEgresosDuplicadoError) {
        const ganador =
          await this.ingresosEgresosRepository.buscarPorCuentaMensualId(
            cuentaMensualId,
          );
        throw ganador ? this.conflictoDuplicado(ganador) : error;
      }
      throw error;
    }
  }

  private conflictoDuplicado(existente: IngresosEgresos): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'Ya existe un libro de ingresos y egresos en esta rendición.',
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
