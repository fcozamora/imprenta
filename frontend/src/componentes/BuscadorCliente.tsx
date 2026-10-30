import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, UserPlus, LoaderCircle, Pencil, Check, Search, X,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';

export interface Cliente {
  id: number;
  cedula: string;
  nombre: string;
  nombre_comercial: string | null;
  /** Número de expediente que lleva la imprenta. */
  expediente?: string | null;
  telefono: string;
  telefono_wa: string | null;
  email_facturacion: string | null;
}

interface Props {
  cliente: Cliente | null;
  onCambio: (cliente: Cliente | null) => void;
}

const VACIO = {
  cedula: '', nombre: '', nombreComercial: '', expediente: '',
  telefono: '', emailFacturacion: '',
};

/** Si lo escrito son puros numeros, lo tomamos como cedula. */
function pareceCedula(texto: string) {
  return /^[\d-]{5,}$/.test(texto.trim());
}

export default function BuscadorCliente({ cliente, onCambio }: Props) {
  const queryCliente = useQueryClient();
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(VACIO);

  // Para no pisar resultados con los de una busqueda anterior mas lenta.
  const peticion = useRef(0);

  useEffect(() => {
    const texto = termino.trim();
    if (texto.length < 3) {
      setResultados([]);
      setSinResultados(false);
      return;
    }

    const temporizador = setTimeout(async () => {
      const mia = ++peticion.current;
      setBuscando(true);
      setError('');
      try {
        const { data } = await api.get<Cliente[]>('/clientes', { params: { q: texto } });
        if (mia !== peticion.current) return;
        setResultados(data.slice(0, 8));
        setSinResultados(data.length === 0);
        setResaltado(0);
      } catch (e) {
        if (mia === peticion.current) setError(mensajeDeError(e));
      } finally {
        if (mia === peticion.current) setBuscando(false);
      }
    }, 350);

    return () => clearTimeout(temporizador);
  }, [termino]);

  function elegir(c: Cliente) {
    onCambio(c);
    setTermino('');
    setResultados([]);
    setSinResultados(false);
    setEditando(false);
    setError('');
  }

  function limpiar() {
    onCambio(null);
    setTermino('');
    setResultados([]);
    setSinResultados(false);
    setEditando(false);
    setError('');
  }

  function registrarNuevo() {
    const texto = termino.trim();
    setForm({
      ...VACIO,
      cedula: pareceCedula(texto) ? texto : '',
      nombre: pareceCedula(texto) ? '' : texto,
    });
    onCambio(null);
    setResultados([]);
    setEditando(true);
  }

  function empezarEdicion() {
    if (!cliente) return;
    setForm({
      cedula: cliente.cedula,
      nombre: cliente.nombre,
      nombreComercial: cliente.nombre_comercial ?? '',
      expediente: cliente.expediente ?? '',
      telefono: cliente.telefono,
      emailFacturacion: cliente.email_facturacion ?? '',
    });
    setEditando(true);
  }

  function teclas(e: React.KeyboardEvent) {
    if (!resultados.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltado((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      elegir(resultados[resaltado]);
    } else if (e.key === 'Escape') {
      setResultados([]);
    }
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        cedula: form.cedula.trim(),
        nombre: form.nombre.trim(),
        nombreComercial: form.nombreComercial.trim() || null,
        expediente: form.expediente.trim(),
        telefono: form.telefono.trim(),
        emailFacturacion: form.emailFacturacion.trim() || null,
      };
      if (cliente) {
        return (await api.patch<Cliente>(`/clientes/${cliente.id}`, cuerpo)).data;
      }
      return (await api.post<Cliente>('/clientes', cuerpo)).data;
    },
    onSuccess: (data) => {
      onCambio(data);
      setEditando(false);
      setSinResultados(false);
      setTermino('');
      setError('');
      queryCliente.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  const completo =
    form.cedula.trim().length >= 5 &&
    form.nombre.trim().length >= 3 &&
    form.telefono.trim().length >= 8;

  return (
    <div className="tarjeta space-y-4">
      <h2 className="font-semibold text-slate-900">Cliente</h2>

      {/* ---------- Buscador ---------- */}
      {!cliente && (
        <div>
          <label className="etiqueta">
            Buscar por cédula o nombre <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="campo pl-9 pr-9"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              onKeyDown={teclas}
              placeholder="Cédula, nombre o nombre comercial"
              autoFocus
            />
            {buscando && (
              <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {resultados.length > 0 && (
            <ul className="mt-1.5 overflow-hidden rounded-lg ring-1 ring-slate-200">
              {resultados.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setResaltado(i)}
                    onClick={() => elegir(c)}
                    className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm
                                transition-colors ${i === resaltado ? 'bg-marca-50' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{c.nombre}</span>
                      {c.nombre_comercial && (
                        <span className="block truncate text-xs text-slate-500">{c.nombre_comercial}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-500">
                      <span className="block font-mono">{c.cedula}</span>
                      <span className="block">{c.telefono}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sinResultados && !editando && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>No hay ningún cliente que coincida.</span>
              <button
                type="button"
                onClick={registrarNuevo}
                className="font-medium text-amber-900 underline underline-offset-2"
              >
                Registrar uno nuevo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- Cliente elegido ---------- */}
      {cliente && !editando && (
        <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="font-medium text-slate-900">{cliente.nombre}</p>
              </div>
              <dl className="mt-1.5 space-y-0.5 text-sm text-slate-600">
                <dd className="font-mono text-xs">{cliente.cedula}</dd>
                {cliente.nombre_comercial && <dd>{cliente.nombre_comercial}</dd>}
                <dd>Tel. {cliente.telefono}</dd>
                {cliente.email_facturacion && <dd>{cliente.email_facturacion}</dd>}
              </dl>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={empezarEdicion} className="boton-secundario py-1.5 px-3 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={limpiar}
                title="Buscar otro cliente"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Alta o edición ---------- */}
      {editando && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Cédula <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder="1-2345-6789"
              />
            </div>
            <div>
              <label className="etiqueta">Teléfono <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="8888-7777"
              />
            </div>
          </div>
          <div>
            <label className="etiqueta">Nombre del cliente <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="etiqueta">Nombre comercial</label>
            <input
              className="campo"
              value={form.nombreComercial}
              onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
            />
          </div>
          <div>
            <label className="etiqueta">N° de expediente</label>
            <input
              className="campo"
              value={form.expediente}
              placeholder="Ej. EXP-2026-014"
              onChange={(e) => setForm({ ...form, expediente: e.target.value })}
            />
          </div>
          <div>
            <label className="etiqueta">Email de facturación</label>
            <input
              type="email"
              className="campo"
              value={form.emailFacturacion}
              onChange={(e) => setForm({ ...form, emailFacturacion: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending || !completo}
              className="boton-primario py-2 text-sm"
            >
              {guardar.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {cliente ? 'Guardar cambios' : 'Registrar cliente'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setError('');
                if (!cliente) setSinResultados(true);
              }}
              className="boton-secundario py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
      )}
    </div>
  );
}
