import { Injectable } from '@nestjs/common';
import type { EventoActividad } from '../../domain/entities/evento-actividad.domain.js';
import {
  RegistroActividadRepositoryPort,
  type FiltrosActividad,
} from '../ports/out/registro-actividad-repository.port.js';

//tope de filas por exportación: más allá conviene acotar con filtros
export const MAX_FILAS_EXPORTACION = 50_000;
const TAMANO_PAGINA = 1000;

const COLUMNAS = [
  'id',
  'fecha_hora',
  'accion',
  'resultado',
  'codigo_http',
  'usuario_id',
  'nombre',
  'apellido',
  'dni',
  'roles',
  'ip',
  'entidad_tipo',
  'entidad_id',
  'organismo_id',
  'cuenta_mensual_id',
  'detalle',
];

//comillas dobles escapadas; un valor que empieza con =, +, - o @ se prefija con ' para que una planilla
//no lo interprete como fórmula (los textos del detalle los carga el usuario)
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  let texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

function fila(e: EventoActividad): string {
  return [
    e.id,
    e.ocurridoEn.toISOString(),
    e.accion,
    e.resultado,
    e.codigoHttp,
    e.actor?.usuarioId,
    e.actor?.nombre,
    e.actor?.apellido,
    e.actor?.dni,
    e.actor?.roles.join('|'),
    e.ip,
    e.entidadTipo,
    e.entidadId,
    e.organismoId,
    e.cuentaMensualId,
    e.detalle,
  ]
    .map(celda)
    .join(',');
}

@Injectable()
export class ExportarActividadUseCase {
  constructor(private readonly repository: RegistroActividadRepositoryPort) {}

  //CSV (UTF-8 con BOM, para que Excel respete los acentos) con los eventos que cumplen los filtros
  async execute(filtros: FiltrosActividad): Promise<string> {
    const lineas = [COLUMNAS.join(',')];
    let cursor: number | undefined;
    let exportadas = 0;

    while (exportadas < MAX_FILAS_EXPORTACION) {
      const limite = Math.min(
        TAMANO_PAGINA,
        MAX_FILAS_EXPORTACION - exportadas,
      );
      const pagina = await this.repository.listar(filtros, limite, cursor);
      for (const evento of pagina.eventos) lineas.push(fila(evento));
      exportadas += pagina.eventos.length;
      if (pagina.siguienteCursor === null) break;
      cursor = pagina.siguienteCursor;
    }
    return `﻿${lineas.join('\r\n')}\r\n`;
  }
}
