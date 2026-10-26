import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../domain/entities/transaccion-libro-banco.domain.js';
import { LibroBancoEntity } from '../entities/libro-banco.entity.js';
import { TransaccionLibroBancoEntity } from '../entities/transaccion-libro-banco.entity.js';

export class LibroBancoMapper {
  static toDomain(entity: LibroBancoEntity): LibroBanco {
    const transacciones = entity.transacciones
      ? entity.transacciones.map(
          (t) =>
            new TransaccionLibroBanco(
              t.fecha,
              t.cheque,
              t.aLaOrdenDe,
              Number(t.depositos),
              Number(t.retiro),
              Number(t.saldo),
              t.id,
            ),
        )
      : [];

    return new LibroBanco(
      entity.cuentaMensualId,
      entity.numeroCuentaCte,
      transacciones,
      entity.id,
      entity.fechaCreacion,
      entity.subidoPorId,
      entity.hashContenido,
    );
  }

  static toEntity(domain: LibroBanco): LibroBancoEntity {
    const entity = new LibroBancoEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.numeroCuentaCte = domain.numeroCuentaCte;
    entity.subidoPorId = domain.subidoPorId!;
    entity.hashContenido = domain.hashContenido!;

    entity.transacciones = domain.transacciones.map((t) => {
      const transaccionEntity = new TransaccionLibroBancoEntity();
      if (t.id) transaccionEntity.id = t.id;
      transaccionEntity.fecha = t.fecha;
      transaccionEntity.cheque = t.cheque;
      transaccionEntity.aLaOrdenDe = t.aLaOrdenDe;
      transaccionEntity.depositos = t.depositos;
      transaccionEntity.retiro = t.retiro;
      transaccionEntity.saldo = t.saldo;
      return transaccionEntity;
    });

    return entity;
  }
}
