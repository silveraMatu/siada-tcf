import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { Organismo } from '../../../organismos/domain/entities/organismo.domain.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { AccesoCuentaService } from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { CuentaMensual } from '../../../cuentas/domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../cuentas/domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../cuentas/domain/enums/estado-cuenta-mensual.enum.js';
import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { ContextoActividadNulo } from '../../../registro-actividad/application/services/contexto-actividad-nulo.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { MotorAuditoriaService } from '../../domain/engine/motor-auditoria.service.js';
import { VERSION_REGLAS } from '../../domain/engine/version-reglas.js';
import { EjecucionAuditoria } from '../../domain/entities/ejecucion-auditoria.domain.js';
import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { LibroBancoV3Rule } from '../../domain/rules/libro-banco-saldo.rule.js';
import { validationsCode } from '../../domain/rules/validations.js';
import { EstadoValidacion } from '../../domain/types/auditoria.types.js';
import {
  DocumentosAuditablesPort,
  type DocumentosAuditables,
} from '../ports/out/documentos-auditables.port.js';
import {
  EjecucionAuditoriaRepositoryPort,
  type EjecucionGuardada,
} from '../ports/out/ejecucion-auditoria-repository.port.js';
import {
  ObservacionRepositoryPort,
  type ConteoObservaciones,
} from '../ports/out/observacion-repository.port.js';
import { EjecutarAuditoriaUseCase } from './ejecutar-auditoria.use-case.js';

const ID_CUENTA = 5;
const ID_ORGANISMO = 10;
const ID_AUDITOR = 77;

//cuenta en memoria: registra los cambios de estado que se piden
class CuentasFalso extends CuentaMensualRepositoryPort {
  cambios: [EstadoCuentaMensual, EstadoCuentaMensual][] = [];

  constructor(public cuenta: CuentaMensual | null) {
    super();
  }
  existe(): Promise<boolean> {
    return Promise.resolve(this.cuenta !== null);
  }
  buscarPorId(): Promise<CuentaMensual | null> {
    return Promise.resolve(this.cuenta);
  }
  obtenerOrganismoId(): Promise<number | null> {
    return Promise.resolve(ID_ORGANISMO);
  }
  documentosFaltantes(): Promise<string[]> {
    return Promise.resolve([]);
  }
  cambiarEstado(
    _id: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean> {
    this.cambios.push([desde, hacia]);
    return Promise.resolve(true);
  }
  presentar(): Promise<boolean> {
    throw new Error('no usado');
  }
  listar(): Promise<CuentaMensualListada[]> {
    throw new Error('no usado');
  }
}

//ejecuciones en memoria con la restricción única (rendición, versión)
class EjecucionesFalso extends EjecucionAuditoriaRepositoryPort {
  guardadas: {
    ejecucion: EjecucionAuditoria;
    observaciones: Observaciones[];
  }[] = [];
  private proximoId = 1;

  constructor(previas: EjecucionAuditoria[] = []) {
    super();
    for (const e of previas)
      this.guardadas.push({ ejecucion: e, observaciones: [] });
  }

  guardar(
    ejecucion: EjecucionAuditoria,
    observaciones: Observaciones[],
  ): Promise<EjecucionGuardada> {
    const igual = this.guardadas.find(
      (g) =>
        g.ejecucion.cuentaMensualId === ejecucion.cuentaMensualId &&
        g.ejecucion.versionReglas === ejecucion.versionReglas,
    );
    if (igual) {
      return Promise.resolve({
        ejecucion: igual.ejecucion,
        observaciones: igual.observaciones,
        creada: false,
      });
    }
    const id = this.proximoId++;
    const guardada = new EjecucionAuditoria({
      cuentaMensualId: ejecucion.cuentaMensualId,
      versionReglas: ejecucion.versionReglas,
      ejecutadaPorId: ejecucion.ejecutadaPorId,
      resultados: ejecucion.resultados,
      id,
    });
    const conId = observaciones.map(
      (o, i) =>
        new Observaciones({
          cuentaMensualId: o.cuentaMensualId,
          codigoRegla: o.codigoRegla,
          tipo: o.tipo,
          descripcion: o.descripcion,
          libroOrigen: o.libroOrigen,
          estado: o.estado,
          transaccionId: o.transaccionId,
          transaccionIngresoEgresoId: o.transaccionIngresoEgresoId,
          id: i + 1,
          ejecucionId: id,
        }),
    );
    this.guardadas.push({ ejecucion: guardada, observaciones: conId });
    return Promise.resolve({
      ejecucion: guardada,
      observaciones: conId,
      creada: true,
    });
  }
  buscarUltima(): Promise<EjecucionAuditoria | null> {
    return Promise.resolve(this.guardadas.at(-1)?.ejecucion ?? null);
  }
  cerrar(): Promise<boolean> {
    throw new Error('no usado');
  }
}

class ObservacionesFalso extends ObservacionRepositoryPort {
  constructor(private readonly ejecuciones: EjecucionesFalso) {
    super();
  }
  obtenerPorEjecucion(ejecucionId: number): Promise<Observaciones[]> {
    return Promise.resolve(
      this.ejecuciones.guardadas.find((g) => g.ejecucion.id === ejecucionId)
        ?.observaciones ?? [],
    );
  }
  contarPorEstado(): Promise<ConteoObservaciones> {
    throw new Error('no usado');
  }
}

class DocumentosFalso extends DocumentosAuditablesPort {
  cargas = 0;
  constructor(private readonly documentos: DocumentosAuditables) {
    super();
  }
  cargar(): Promise<DocumentosAuditables> {
    this.cargas++;
    return Promise.resolve(this.documentos);
  }
}

class OrganismosFalso extends OrganismoRepositoryPort {
  crear(): Promise<Organismo> {
    throw new Error('no usado');
  }
  buscarPorId(): Promise<Organismo | null> {
    throw new Error('no usado');
  }
  buscarTodos(): Promise<Organismo[]> {
    throw new Error('no usado');
  }
  activar(): Promise<boolean> {
    throw new Error('no usado');
  }
  desactivar(): Promise<boolean> {
    throw new Error('no usado');
  }
  asignarAuditor(): Promise<boolean> {
    throw new Error('no usado');
  }
  buscarIdsPorAuditor(): Promise<number[]> {
    throw new Error('no usado');
  }
  esAuditorDelOrganismo(
    auditorId: number,
    organismoId: number,
  ): Promise<boolean> {
    return Promise.resolve(
      auditorId === ID_AUDITOR && organismoId === ID_ORGANISMO,
    );
  }
}

const tx = (id: number, depositos: number, retiro: number, saldo: number) =>
  new TransaccionLibroBanco(
    null,
    null,
    `Mov ${id}`,
    depositos,
    retiro,
    saldo,
    id,
  );

//segunda fila con el saldo equivocado: V3 da FALLO con una observación
const libroConFallo = new LibroBanco(
  ID_CUENTA,
  '1/1',
  [tx(1, 100, 0, 100), tx(2, 50, 0, 999)],
  1,
);
const libroSano = new LibroBanco(
  ID_CUENTA,
  '1/1',
  [tx(1, 100, 0, 100), tx(2, 50, 0, 150)],
  1,
);

const cuentaEn = (estado: EstadoCuentaMensual) =>
  new CuentaMensual(3, 1, estado, ID_CUENTA);
const auditor = { usuarioId: ID_AUDITOR, roles: [Rol.AUDITOR] };

const armar = (
  estado: EstadoCuentaMensual | null,
  { libros = [libroConFallo], previas = [] as EjecucionAuditoria[] } = {},
) => {
  const cuentas = new CuentasFalso(estado ? cuentaEn(estado) : null);
  const ejecuciones = new EjecucionesFalso(previas);
  const documentos = new DocumentosFalso({ librosBanco: libros });
  const casoDeUso = new EjecutarAuditoriaUseCase(
    new MotorAuditoriaService([new LibroBancoV3Rule()]),
    ejecuciones,
    new ObservacionesFalso(ejecuciones),
    cuentas,
    documentos,
    new AccesoCuentaService(
      new OrganismosFalso(),
      new ResponsableDelOrganismoService(undefined as never),
    ),
    new ContextoActividadNulo(),
  );
  return { cuentas, ejecuciones, documentos, casoDeUso };
};

const ejecucionPrevia = (versionReglas: string, id = 9) =>
  new EjecucionAuditoria({
    id,
    cuentaMensualId: ID_CUENTA,
    versionReglas,
    ejecutadaPorId: ID_AUDITOR,
    resultados: [
      {
        codigoRegla: validationsCode.V3,
        estado: EstadoValidacion.VERIFICADO,
        filasEvaluadas: 1,
        librosFaltantes: [],
      },
    ],
  });

describe('EjecutarAuditoriaUseCase', () => {
  it('la primera ejecución toma la rendición, corre el motor y guarda la ejecución con sus observaciones', async () => {
    const { cuentas, ejecuciones, casoDeUso } = armar(
      EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    );

    const resultado = await casoDeUso.execute(ID_CUENTA, auditor);

    expect(resultado.creada).toBe(true);
    expect(cuentas.cambios).toEqual([
      [
        EstadoCuentaMensual.LISTO_PARA_AUDITAR,
        EstadoCuentaMensual.EN_AUDITORIA,
      ],
    ]);
    expect(ejecuciones.guardadas).toHaveLength(1);
    expect(resultado.ejecucion).toMatchObject({
      cuentaMensualId: ID_CUENTA,
      versionReglas: VERSION_REGLAS,
      ejecutadaPorId: ID_AUDITOR,
    });
    expect(resultado.resultados).toHaveLength(1);
    expect(resultado.resultados[0]).toMatchObject({
      codigoRegla: validationsCode.V3,
      estado: EstadoValidacion.FALLO,
      filasEvaluadas: 1,
      librosFaltantes: [],
    });
    //la observación vuelve con su id y la ejecución a la que pertenece
    expect(resultado.resultados[0].observaciones).toHaveLength(1);
    expect(resultado.resultados[0].observaciones[0]).toMatchObject({
      id: 1,
      ejecucionId: 1,
      transaccionId: 2,
    });
  });

  it('guarda las reglas que no pudieron correr como FALTAN_LIBROS, sin observaciones', async () => {
    const { ejecuciones, casoDeUso } = armar(
      EstadoCuentaMensual.LISTO_PARA_AUDITAR,
      { libros: [] },
    );

    const resultado = await casoDeUso.execute(ID_CUENTA, auditor);

    expect(resultado.resultados[0]).toMatchObject({
      estado: EstadoValidacion.FALTAN_LIBROS,
      filasEvaluadas: null,
      librosFaltantes: ['LIBRO_BANCO'],
      observaciones: [],
    });
    expect(ejecuciones.guardadas[0].observaciones).toEqual([]);
  });

  it('con un libro consistente la regla queda VERIFICADO y no se guardan observaciones', async () => {
    const { casoDeUso } = armar(EstadoCuentaMensual.LISTO_PARA_AUDITAR, {
      libros: [libroSano],
    });

    const { resultados } = await casoDeUso.execute(ID_CUENTA, auditor);

    expect(resultados[0].estado).toBe(EstadoValidacion.VERIFICADO);
    expect(resultados[0].observaciones).toEqual([]);
  });

  it('ejecutar de nuevo con las mismas reglas devuelve la misma ejecución sin volver a correr nada', async () => {
    const { cuentas, ejecuciones, documentos, casoDeUso } = armar(
      EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    );
    const primera = await casoDeUso.execute(ID_CUENTA, auditor);
    cuentas.cuenta = cuentaEn(EstadoCuentaMensual.EN_AUDITORIA);

    const segunda = await casoDeUso.execute(ID_CUENTA, auditor);

    expect(segunda.creada).toBe(false);
    expect(segunda.ejecucion.id).toBe(primera.ejecucion.id);
    expect(segunda.resultados[0].observaciones.map((o) => o.id)).toEqual(
      primera.resultados[0].observaciones.map((o) => o.id),
    );
    expect(ejecuciones.guardadas).toHaveLength(1);
    expect(documentos.cargas).toBe(1);
    //solo la primera vez cambia el estado
    expect(cuentas.cambios).toHaveLength(1);
  });

  it('si cambió la versión de reglas guarda una ejecución nueva y conserva la anterior', async () => {
    const { cuentas, ejecuciones, casoDeUso } = armar(
      EstadoCuentaMensual.EN_AUDITORIA,
      { previas: [ejecucionPrevia('0')] },
    );

    const resultado = await casoDeUso.execute(ID_CUENTA, auditor);

    expect(resultado.creada).toBe(true);
    expect(resultado.ejecucion.versionReglas).toBe(VERSION_REGLAS);
    expect(ejecuciones.guardadas.map((g) => g.ejecucion.versionReglas)).toEqual(
      ['0', VERSION_REGLAS],
    );
    //ya estaba tomada: no se vuelve a cambiar el estado
    expect(cuentas.cambios).toEqual([]);
  });

  it('un ADMIN puede auditar cualquier rendición', async () => {
    const { casoDeUso } = armar(EstadoCuentaMensual.LISTO_PARA_AUDITAR);

    const resultado = await casoDeUso.execute(ID_CUENTA, {
      usuarioId: 1,
      roles: [Rol.ADMIN],
    });

    expect(resultado.creada).toBe(true);
  });

  it('404 si la cuenta no existe', async () => {
    const { ejecuciones, casoDeUso } = armar(null);

    await expect(casoDeUso.execute(ID_CUENTA, auditor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ejecuciones.guardadas).toEqual([]);
  });

  it('403 si el auditor no tiene asignado el organismo, antes que cualquier 409', async () => {
    const { ejecuciones, casoDeUso } = armar(EstadoCuentaMensual.AUDITADA);

    await expect(
      casoDeUso.execute(ID_CUENTA, { usuarioId: 1, roles: [Rol.AUDITOR] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ejecuciones.guardadas).toEqual([]);
  });

  it('409 si la rendición todavía está en borrador', async () => {
    const { cuentas, ejecuciones, casoDeUso } = armar(
      EstadoCuentaMensual.EN_BORRADOR,
    );

    await expect(casoDeUso.execute(ID_CUENTA, auditor)).rejects.toThrow(
      new ConflictException(
        'La rendición todavía no fue presentada: no se puede auditar.',
      ),
    );
    expect(cuentas.cambios).toEqual([]);
    expect(ejecuciones.guardadas).toEqual([]);
  });

  it.each([
    EstadoCuentaMensual.AUDITADA,
    EstadoCuentaMensual.CON_OBSERVACIONES,
  ])('409 si la auditoría ya fue cerrada (%s)', async (estado) => {
    const { ejecuciones, casoDeUso } = armar(estado, {
      previas: [ejecucionPrevia(VERSION_REGLAS)],
    });

    await expect(casoDeUso.execute(ID_CUENTA, auditor)).rejects.toThrow(
      new ConflictException('La auditoría de esta rendición ya fue cerrada.'),
    );
    expect(ejecuciones.guardadas).toHaveLength(1);
  });
});
