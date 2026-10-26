import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { LibroBancoV3Rule } from './libro-banco-saldo.rule.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

const tx = (
  id: number,
  depositos: number,
  retiro: number,
  saldo: number,
): TransaccionLibroBanco =>
  new TransaccionLibroBanco(
    '2025-01-01',
    null,
    `Proveedor ${id}`,
    depositos,
    retiro,
    saldo,
    id,
  );

const libro = (transacciones: TransaccionLibroBanco[]): LibroBanco =>
  new LibroBanco(7, null, transacciones, 1);

const contexto = (...libros: LibroBanco[]) => ({
  cuentaMensualId: 7,
  librosBanco: libros,
});

describe('LibroBancoV3Rule (V3)', () => {
  const regla = new LibroBancoV3Rule();
  const observar = (c: AuditoriaContext) => regla.execute(c).observaciones;

  it('declara su código, su descripción y el libro que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.V3);
    expect(regla.descripcion).toBe('Saldo de cuenta');
    expect(regla.librosRequeridos).toEqual(['LIBRO_BANCO']);
  });

  it('devuelve VERIFICADO sin mensaje si todos los saldos son consistentes', () => {
    const resultado = regla.execute(
      contexto(libro([tx(1, 100, 0, 100), tx(2, 50, 0, 150)])),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.V3,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
    });
  });

  it('devuelve FALLO con las observaciones si hay una fila incorrecta', () => {
    const resultado = regla.execute(
      contexto(libro([tx(1, 100, 0, 100), tx(2, 50, 0, 160)])),
    );

    expect(resultado.estado).toBe(EstadoValidacion.FALLO);
    expect(resultado.codigoRegla).toBe(validationsCode.V3);
    expect(resultado.observaciones).toHaveLength(1);
  });

  it('sin libros en el contexto no falla: queda VERIFICADO sin hallazgos', () => {
    const resultado = regla.execute({ cuentaMensualId: 7 });

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(resultado.observaciones).toEqual([]);
  });

  it('no genera observaciones si todos los saldos son consistentes', () => {
    const resultado = observar(
      contexto(
        libro([tx(1, 100, 0, 100), tx(2, 50, 0, 150), tx(3, 0, 30, 120)]),
      ),
    );

    expect(resultado).toEqual([]);
  });

  it('marca la fila con saldo incorrecto con todos sus campos', () => {
    const resultado = observar(
      contexto(libro([tx(1, 100, 0, 100), tx(2, 50, 0, 160)])),
    );

    expect(resultado).toHaveLength(1);
    const [obs] = resultado;
    expect(obs.cuentaMensualId).toBe(7);
    expect(obs.codigoRegla).toBe(validationsCode.V3);
    expect(obs.tipo).toBe(validationsType.INTERNA);
    expect(obs.libroOrigen).toBe(LibroOrigen.LIBRO_BANCO);
    expect(obs.estado).toBe(EstadoObservacion.ABIERTA);
    expect(obs.transaccionId).toBe(2);
    expect(obs.descripcion).toBe(
      'El saldo calculado (150.00) no coincide con el saldo informado (160.00). Diferencia: 10.00.',
    );
  });

  it('no genera errores en cascada tras una fila incorrecta', () => {
    //la fila 2 está mal (debería ser 150); las siguientes son coherentes con el saldo informado
    const resultado = observar(
      contexto(
        libro([tx(1, 100, 0, 100), tx(2, 50, 0, 999), tx(3, 0, 99, 900)]),
      ),
    );

    expect(resultado.map((o) => o.transaccionId)).toEqual([2]);
  });

  it('respeta el orden de carga por id aunque lleguen desordenadas', () => {
    const resultado = observar(
      contexto(
        libro([tx(3, 0, 30, 120), tx(1, 100, 0, 100), tx(2, 50, 0, 150)]),
      ),
    );

    expect(resultado).toEqual([]);
  });

  it('tolera hasta 0.01 de diferencia y marca desde 0.02', () => {
    const tolerada = observar(
      contexto(libro([tx(1, 0, 0, 100), tx(2, 10, 0, 110.01)])),
    );
    const marcada = observar(
      contexto(libro([tx(1, 0, 0, 100), tx(2, 10, 0, 110.02)])),
    );

    expect(tolerada).toEqual([]);
    expect(marcada).toHaveLength(1);
  });

  it('no marca falsos positivos por coma flotante', () => {
    //0.1 + 0.2 = 0.30000000000000004 en coma flotante
    const resultado = observar(
      contexto(libro([tx(1, 0.1, 0, 0.1), tx(2, 0.2, 0, 0.3)])),
    );

    expect(resultado).toEqual([]);
  });

  it('no genera observaciones con 0 o 1 transacción', () => {
    expect(observar(contexto(libro([])))).toEqual([]);
    expect(observar(contexto(libro([tx(1, 100, 0, 5)])))).toEqual([]);
  });

  it('evalúa cada libro por separado, sin encadenar saldos entre libros', () => {
    const a = libro([tx(1, 100, 0, 100), tx(2, 50, 0, 150)]);
    //el primer saldo de b (900) no se compara con el último de a (150)
    const b = libro([tx(3, 0, 0, 900), tx(4, 0, 100, 700)]);

    const resultado = observar(contexto(a, b));

    expect(resultado.map((o) => o.transaccionId)).toEqual([4]);
  });

  it('no muta el arreglo de transacciones del libro', () => {
    const transacciones = [tx(2, 50, 0, 150), tx(1, 100, 0, 100)];

    observar(contexto(libro(transacciones)));

    expect(transacciones.map((t) => t.id)).toEqual([2, 1]);
  });
});
