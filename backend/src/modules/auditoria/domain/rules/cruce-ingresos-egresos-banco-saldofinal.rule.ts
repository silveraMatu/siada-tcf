import type { NombreLibro } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import {
  compararTotales,
  sumarSaldosFinalesBanco,
} from './cruce-ingresos-egresos-banco.js';
import { ordenarPorFila } from './ingresos-egresos-saldos.js';
import { aCentavos } from './montos.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import { descripcionRegla, validationsCode } from './validations.js';

//C6: el bancoSaldo de la última fila del libro de ingresos y egresos debe coincidir con el saldo final
//de los libros banco (la suma del saldo de la última fila de cada uno)
export class CruceSaldoFinalC6Rule implements ReglaAuditoria {
  readonly codigo = validationsCode.C6;
  readonly descripcion = descripcionRegla[validationsCode.C6];
  readonly librosRequeridos: NombreLibro[] = [
    'LIBRO_BANCO',
    'INGRESOS_EGRESOS',
  ];

  execute(context: AuditoriaContext) {
    const ultima = ordenarPorFila(
      context.ingresosEgresos?.transacciones ?? [],
    ).at(-1);

    return compararTotales(
      context,
      this.codigo,
      'Saldo bancario inconsistente',
      { ingresosEgresos: 'el saldo final de banco', banco: 'el saldo final' },
      ultima ? aCentavos(ultima.bancoSaldo) : 0,
      sumarSaldosFinalesBanco(context.librosBanco),
    );
  }
}
