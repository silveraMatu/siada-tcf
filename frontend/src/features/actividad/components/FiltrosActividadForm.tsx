import { ChevronDown, Download, Loader2, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACCIONES, ENTIDADES, RESULTADOS } from '../constants';
import {
  aFiltros,
  FORMULARIO_VACIO,
  type FormularioFiltros,
} from '../lib/filtros';
import type { FiltrosActividad } from '../types';

const TODAS = 'todas';

interface FiltrosActividadFormProps {
  /** Se invoca con los filtros ya validados cuando se aprieta «Aplicar». */
  onAplicar: (filtros: FiltrosActividad) => void;
  onExportar: () => void;
  exportando: boolean;
}

/** Filtros de la bitácora: no consultan por tecla, solo al aplicar. */
export function FiltrosActividadForm({
  onAplicar,
  onExportar,
  exportando,
}: FiltrosActividadFormProps) {
  const [form, setForm] = useState<FormularioFiltros>(FORMULARIO_VACIO);
  const [mas, setMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiar = (campo: keyof FormularioFiltros) => (valor: string) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setError(null);
  };

  function aplicar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = aFiltros(form);
    if (resultado.error !== undefined) {
      setError(resultado.error);
      return;
    }
    setError(null);
    onAplicar(resultado.filtros);
  }

  function limpiar() {
    setForm(FORMULARIO_VACIO);
    setError(null);
    onAplicar({});
  }

  return (
    <form
      onSubmit={aplicar}
      aria-label="Filtros de la bitácora"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-desde">Desde</Label>
          <Input
            id="filtro-desde"
            type="datetime-local"
            value={form.desde}
            onChange={(e) => cambiar('desde')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-hasta">Hasta</Label>
          <Input
            id="filtro-hasta"
            type="datetime-local"
            value={form.hasta}
            onChange={(e) => cambiar('hasta')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-accion">Acción</Label>
          <Select
            value={form.accion || TODAS}
            onValueChange={(valor) =>
              cambiar('accion')(valor === TODAS ? '' : valor)
            }
          >
            <SelectTrigger id="filtro-accion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas</SelectItem>
              {Object.entries(ACCIONES).map(([codigo, etiqueta]) => (
                <SelectItem key={codigo} value={codigo}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-resultado">Resultado</Label>
          <Select
            value={form.resultado || TODAS}
            onValueChange={(valor) =>
              cambiar('resultado')(valor === TODAS ? '' : valor)
            }
          >
            <SelectTrigger id="filtro-resultado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todos</SelectItem>
              {Object.entries(RESULTADOS).map(([codigo, etiqueta]) => (
                <SelectItem key={codigo} value={codigo}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-dni">DNI del usuario</Label>
          <Input
            id="filtro-dni"
            inputMode="numeric"
            placeholder="Sin puntos ni guiones"
            value={form.dni}
            onChange={(e) => cambiar('dni')(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={mas}
          aria-controls="mas-filtros"
          onClick={() => setMas((abierto) => !abierto)}
          className="-ml-2.5"
        >
          <ChevronDown
            className={
              mas
                ? 'rotate-180 motion-safe:transition-transform'
                : 'motion-safe:transition-transform'
            }
          />
          Más filtros
        </Button>
        {mas && (
          <div
            id="mas-filtros"
            className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="filtro-usuario">Id de usuario</Label>
              <Input
                id="filtro-usuario"
                inputMode="numeric"
                value={form.usuarioId}
                onChange={(e) => cambiar('usuarioId')(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-organismo">Id de organismo</Label>
              <Input
                id="filtro-organismo"
                inputMode="numeric"
                value={form.organismoId}
                onChange={(e) => cambiar('organismoId')(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-rendicion">Id de rendición</Label>
              <Input
                id="filtro-rendicion"
                inputMode="numeric"
                value={form.cuentaMensualId}
                onChange={(e) => cambiar('cuentaMensualId')(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-entidad">Tipo de entidad</Label>
              <Select
                value={form.entidadTipo || TODAS}
                onValueChange={(valor) =>
                  cambiar('entidadTipo')(valor === TODAS ? '' : valor)
                }
              >
                <SelectTrigger id="filtro-entidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas</SelectItem>
                  {Object.entries(ENTIDADES).map(([codigo, etiqueta]) => (
                    <SelectItem key={codigo} value={codigo}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-entidad-id">Id de la entidad</Label>
              <Input
                id="filtro-entidad-id"
                inputMode="numeric"
                value={form.entidadId}
                onChange={(e) => cambiar('entidadId')(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Search />
            Aplicar
          </Button>
          <Button type="button" variant="outline" onClick={limpiar}>
            <X />
            Limpiar
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onExportar}
          disabled={exportando}
        >
          {exportando ? <Loader2 className="animate-spin" /> : <Download />}
          Exportar CSV
        </Button>
      </div>
    </form>
  );
}
