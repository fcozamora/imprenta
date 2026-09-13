import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stamp, Plus, Search, LoaderCircle, TriangleAlert, X, ArrowUpDown, History,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';
import { useSesion } from '../lib/sesion';
import { fechaHora } from '../lib/formato';

interface Sello {
  id: number;
  codigo: string;
  descripcion: string | null;
  cantidad: number;
  minimo: number;
  tinta_id: number;
  tinta: string;
  tinta_hex: string;
  bajo_minimo: number;
  actualizado_en: string;
}

export default function Sellos() {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const { data: catalogos } = useCatalogos();

  const [busqueda, setBusqueda] = useState('');
  const [tintaId, setTintaId] = useState<number | ''>('');
  const [orden, setOrden] = useState<'codigo' | 'cantidad' | 'tinta'>('codigo');
  const [nuevo, setNuevo] = useState(false);
  const [moviendo, setMoviendo] = useState<Sello | null>(null);
  const [historial, setHistorial] = useState<Sello | null>(null);

  const gestiona = puede('sellos.gestionar');

  const { data: sellos = [], isLoading } = useQuery({
    queryKey: ['sellos', busqueda, tintaId, orden],
    queryFn: async () => {
      const p = new URLSearchParams({ orden });
      if (busqueda) p.set('q', busqueda);
      if (tintaId) p.set('tinta', String(tintaId));
      return (await api.get<Sello[]>(`/sellos?${p}`)).data;
    },
  });

  const totalUnidades = sellos.reduce((s, x) => s + x.cantidad, 0);
  const bajos = sellos.filter((s) => s.bajo_minimo).length;

  function refrescar() {
    cliente.invalidateQueries({ queryKey: ['sellos'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventario de sellos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {sellos.length} códigos · {totalUnidades} unidades
            {bajos > 0 && ` · ${bajos} bajo mínimo`}
          </p>
        </div>
        {gestiona && (
          <button onClick={() => setNuevo(true)} className="boton-primario">
            <Plus className="h-4 w-4" />
            Agregar sello
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="campo py-2 pl-9" placeholder="Código o descripción"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <select className="campo w-auto py-2" value={tintaId}
          onChange={(e) => setTintaId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Todas las tintas</option>
          {catalogos?.tintas.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        <select className="campo w-auto py-2" value={orden}
          onChange={(e) => setOrden(e.target.value as any)}>
          <option value="codigo">Ordenar por código</option>
          <option value="tinta">Ordenar por tinta</option>
          <option value="cantidad">Ordenar por cantidad</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : sellos.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Stamp className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay sellos registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Tinta</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                {gestiona && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sellos.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50/70 ${s.bajo_minimo ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{s.codigo}</td>
                  <td className="px-4 py-3 text-slate-600">{s.descripcion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full ring-1 ring-slate-300"
                        style={{ backgroundColor: s.tinta_hex }} />
                      <span className="text-slate-600">{s.tinta}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${s.bajo_minimo ? 'text-red-600' : 'text-slate-900'}`}>
                      {s.cantidad}
                    </span>
                    {s.bajo_minimo === 1 && (
                      <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                    )}
                    {s.minimo > 0 && (
                      <span className="ml-1 text-xs text-slate-400">/ mín. {s.minimo}</span>
                    )}
                  </td>
                  {gestiona && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setMoviendo(s)} title="Actualizar cantidad"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => setHistorial(s)} title="Ver movimientos"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nuevo && <ModalNuevoSello onCerrar={() => setNuevo(false)} onGuardado={() => { setNuevo(false); refrescar(); }} />}
      {moviendo && <ModalMovimiento sello={moviendo} onCerrar={() => setMoviendo(null)} onGuardado={() => { setMoviendo(null); refrescar(); }} />}
      {historial && <ModalHistorial sello={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalNuevoSello({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const { data: catalogos } = useCatalogos();
  const [form, setForm] = useState({ codigo: '', descripcion: '', tintaId: 0, cantidad: 0, minimo: 0 });
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () => api.post('/sellos', {
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim() || null,
      tintaId: Number(form.tintaId),
      cantidad: Number(form.cantidad),
      minimo: Number(form.minimo),
    }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <Modal titulo="Agregar sello" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="etiqueta">Código <span className="text-red-500">*</span></label>
          <input className="campo" value={form.codigo} autoFocus
            onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        </div>
        <div>
          <label className="etiqueta">Descripción</label>
          <input className="campo" value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div>
          <label className="etiqueta">Tinta <span className="text-red-500">*</span></label>
          <select className="campo" value={form.tintaId}
            onChange={(e) => setForm({ ...form, tintaId: Number(e.target.value) })}>
            <option value={0}>Seleccione</option>
            {catalogos?.tintas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Cantidad inicial</label>
            <input type="number" min={0} className="campo" value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
          </div>
          <div>
            <label className="etiqueta">Mínimo de alerta</label>
            <input type="number" min={0} className="campo" value={form.minimo}
              onChange={(e) => setForm({ ...form, minimo: Number(e.target.value) })} />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={() => guardar.mutate()} className="boton-primario flex-1"
            disabled={guardar.isPending || !form.codigo.trim() || !form.tintaId}>
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function ModalMovimiento({ sello, onCerrar, onGuardado }: { sello: Sello; onCerrar: () => void; onGuardado: () => void }) {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const mover = useMutation({
    mutationFn: () => api.post(`/sellos/${sello.id}/movimiento`, {
      tipo, cantidad: Number(cantidad), motivo: motivo.trim() || undefined,
    }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const resultado = tipo === 'ENTRADA' ? sello.cantidad + Number(cantidad)
    : tipo === 'SALIDA' ? sello.cantidad - Number(cantidad)
    : Number(cantidad);

  return (
    <Modal titulo={`Actualizar ${sello.codigo}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Existencia actual: <strong className="text-slate-900">{sello.cantidad}</strong></p>

        <div className="flex gap-2">
          {(['ENTRADA', 'SALIDA', 'AJUSTE'] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                tipo === t ? 'bg-marca-600 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div>
          <label className="etiqueta">{tipo === 'AJUSTE' ? 'Existencia real' : 'Cantidad'}</label>
          <input type="number" min={0} className="campo" value={cantidad} autoFocus
            onChange={(e) => setCantidad(Number(e.target.value))} />
          <p className="mt-1 text-xs text-slate-500">
            Quedará en <strong className={resultado < 0 ? 'text-red-600' : 'text-slate-900'}>{resultado}</strong>
          </p>
        </div>

        <div>
          <label className="etiqueta">Motivo</label>
          <input className="campo" value={motivo} placeholder="Ej. Venta mostrador"
            onChange={(e) => setMotivo(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={() => mover.mutate()} disabled={mover.isPending || resultado < 0}
            className="boton-primario flex-1">
            {mover.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Registrar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function ModalHistorial({ sello, onCerrar }: { sello: Sello; onCerrar: () => void }) {
  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['sellos', sello.id, 'movimientos'],
    queryFn: async () => (await api.get<any[]>(`/sellos/${sello.id}/movimientos`)).data,
  });

  return (
    <Modal titulo={`Movimientos de ${sello.codigo}`} onCerrar={onCerrar}>
      {isLoading ? (
        <div className="grid place-items-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : movimientos.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Sin movimientos registrados</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {movimientos.map((m, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <div>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700'
                  : m.tipo === 'SALIDA' ? 'bg-red-100 text-red-700'
                  : 'bg-slate-200 text-slate-700'
                }`}>{m.tipo}</span>
                <p className="mt-1 text-xs text-slate-500">{m.usuario} · {fechaHora(m.creado_en)}</p>
                {m.motivo && <p className="text-xs text-slate-500">{m.motivo}</p>}
              </div>
              <p className="shrink-0 text-right text-xs text-slate-600">
                {m.saldo_anterior} → <strong className="text-slate-900">{m.saldo_nuevo}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}