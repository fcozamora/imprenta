import { useState } from 'react';
import { Plus, Search, Pencil, Check, Undo2, Trash2, X } from 'lucide-react';
import {
  usePedidosExternos,
  useGuardarPedidoExterno,
  useRetirarPedidoExterno,
  useEliminarPedidoExterno,
} from '../lib/consultas.js';
import type { PedidoExterno, DatosPedidoExterno } from '../lib/tipos.js';

const VACIO: DatosPedidoExterno = {
  numero_orden: '',
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  pedido_solicitado: '',
  cantidad: '',
  descripcion: '',
};

function fechaCorta(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PedidosExternos() {
  const [verRetirados, setVerRetirados] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<PedidoExterno | null>(null);
  const [form, setForm] = useState<DatosPedidoExterno>(VACIO);
  const [error, setError] = useState('');

  const { data: pedidos = [], isLoading } = usePedidosExternos(verRetirados, busqueda);
  const guardar = useGuardarPedidoExterno();
  const retirar = useRetirarPedidoExterno();
  const eliminar = useEliminarPedidoExterno();

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setError('');
    setAbierto(true);
  }

  function abrirEdicion(p: PedidoExterno) {
    setEditando(p);
    setForm({
      numero_orden: p.numero_orden,
      fecha_solicitud: p.fecha_solicitud.slice(0, 10),
      pedido_solicitado: p.pedido_solicitado,
      cantidad: p.cantidad,
      descripcion: p.descripcion ?? '',
    });
    setError('');
    setAbierto(true);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await guardar.mutateAsync({ id: editando?.id, datos: form });
      setAbierto(false);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje ?? 'No se pudo guardar el pedido');
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-semibold text-slate-800 mr-auto">Pedidos Externos</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Orden, pedido, descripción o cliente"
            className="pl-9 pr-3 py-2 w-72 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
          <input type="checkbox"
            checked={verRetirados}
            onChange={(e) => setVerRetirados(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300" />
          Ver retirados
        </label>

        <button onClick={abrirNuevo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />
          Nuevo pedido
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left"># Orden</th>
              <th className="px-4 py-3 text-left">Fecha de solicitud</th>
              <th className="px-4 py-3 text-left">Pedido solicitado</th>
              <th className="px-4 py-3 text-left">Cant.</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-center">Retirado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Cargando…</td>
              </tr>
            )}

            {!isLoading && pedidos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No hay pedidos {verRetirados ? '' : 'pendientes'}
                </td>
              </tr>
            )}

            {pedidos.map((p) => (
              <tr key={p.id} className={p.retirado ? 'bg-slate-50 text-slate-400' : 'hover:bg-sky-50/40'}>
                <td className="px-4 py-3 font-semibold text-slate-800">{p.numero_orden}</td>
                <td className="px-4 py-3">{fechaCorta(p.fecha_solicitud)}</td>
                <td className="px-4 py-3">{p.pedido_solicitado}</td>
                <td className="px-4 py-3 whitespace-nowrap">{p.cantidad}</td>
                <td className="px-4 py-3">{p.descripcion || '—'}</td>
                <td className="px-4 py-3">{p.cliente}</td>
                <td className="px-4 py-3 text-center">
                  {p.retirado ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      Sí
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => retirar.mutate({ id: p.id, retirado: !p.retirado })}
                      title={p.retirado ? 'Marcar como no retirado' : 'Marcar como retirado'}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-500">
                      {p.retirado ? <Undo2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => abrirEdicion(p)}
                      title="Editar"
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-500">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                        if (confirm(`¿Eliminar el pedido de la orden ${p.numero_orden}?`)) {
                          eliminar.mutate(p.id);
                        }
                      }}
                      title="Eliminar"
                      className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierto && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">
                {editando ? 'Editar pedido externo' : 'Nuevo pedido externo'}
              </h2>
              <button onClick={() => setAbierto(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={enviar} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1"># de orden</label>
                  <input value={form.numero_orden}
                    onChange={(e) => setForm({ ...form, numero_orden: e.target.value })}
                    required
                    inputMode="numeric"
                    placeholder="1024"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de solicitud</label>
                  <input type="date"
                    value={form.fecha_solicitud}
                    onChange={(e) => setForm({ ...form, fecha_solicitud: e.target.value })}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pedido solicitado</label>
                <input value={form.pedido_solicitado}
                  onChange={(e) => setForm({ ...form, pedido_solicitado: e.target.value })}
                  required
                  placeholder="DTF TEXTIL"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
                <input value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                  required
                  placeholder="58*1 METRO"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <input value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="UNIVERSAL"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button"
                  onClick={() => setAbierto(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={guardar.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50">
                  {guardar.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}