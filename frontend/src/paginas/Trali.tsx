import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, LoaderCircle, X, Pencil, Trash2, Search, Download, PackageCheck, Printer,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { fecha } from '../lib/formato';

type Direccion = 'ENVIADA' | 'RECIBIDA';

interface Encomienda {
  id: number;
  fecha: string;
  direccion: Direccion;
  numero_guia: string | null;
  status: 'CONTADO' | 'POR_COBRAR' | null;
  monto: string | null;
  persona_envia: string | null;
  persona_recibe: string | null;
  destino: string | null;
  retirado_por: string | null;
  notas: string | null;
  entregada_en: string | null;
  entregada_por: string | null;
  registrado_por: string;
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function haceDias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function colones(valor: string | null) {
  if (valor == null) return '—';
  return `₡${Number(valor).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

export default function Trali() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [direccion, setDireccion] = useState<Direccion>('ENVIADA');
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Encomienda | 'nueva' | null>(null);
  const [verEntregadas, setVerEntregadas] = useState(false);
  const [entregando, setEntregando] = useState<Encomienda | null>(null);

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['trali', direccion, desde, hasta, busqueda, verEntregadas],
    queryFn: async () => {
      const p = new URLSearchParams({ direccion, desde, hasta });
      if (busqueda) p.set('q', busqueda);
      if (verEntregadas) p.set('entregadas', 'true');
      return (await api.get<Encomienda[]>(`/trali?${p}`)).data;
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/trali/${id}`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['trali'] }),
    onError: (e) => alert(mensajeDeError(e)),
  });

  const enviadas = direccion === 'ENVIADA';
  const porCobrar = filas
    .filter((f) => f.status === 'POR_COBRAR')
    .reduce((s, f) => s + Number(f.monto ?? 0), 0);

  function exportar() {
    const cabecera = enviadas
      ? ['Fecha', 'N. de guía', 'Status', 'Persona que envía', 'Persona que recibe', 'Destino']
      : ['Fecha', 'N. de guía', 'Status', 'Monto', 'Persona envía', 'Persona que recibe', 'Retirado por'];
    const cuerpo = filas.map((f) =>
      enviadas
        ? [fecha(f.fecha), f.numero_guia, f.status, f.persona_envia, f.persona_recibe, f.destino]
        : [fecha(f.fecha), f.numero_guia, f.status, f.monto, f.persona_envia, f.persona_recibe, f.retirado_por]
    );
    const csv = [cabecera, ...cuerpo]
      .map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `trali_${direccion.toLowerCase()}_${desde}_${hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  /** Hoja para firmar: las dos direcciones en la misma página. */
  function imprimirReporte() {
    const p = new URLSearchParams({ desde, hasta });
    if (verEntregadas) p.set('entregadas', 'true');
    navegar(`/trali/imprimir?${p}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trali</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {filas.length} encomienda{filas.length === 1 ? '' : 's'}
            {porCobrar > 0 && ` · ₡${porCobrar.toLocaleString('es-CR')} por cobrar`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} disabled={filas.length === 0} className="boton-secundario">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button onClick={imprimirReporte} className="boton-secundario">
            <Printer className="h-4 w-4" />
            Reporte
          </button>
          <button onClick={() => setEditando('nueva')} className="boton-primario">
            <Plus className="h-4 w-4" />
            Registrar
          </button>
        </div>
      </div>

      {/* Dirección */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setDireccion('ENVIADA')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            direccion === 'ENVIADA'
              ? 'border-marca-600 text-marca-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="h-4 w-4" />
          Enviadas a San José
        </button>
        <button
          onClick={() => setDireccion('RECIBIDA')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            direccion === 'RECIBIDA'
              ? 'border-marca-600 text-marca-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          Recibidas en San Carlos
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="etiqueta">Desde</label>
          <input type="date" className="campo w-auto py-2" value={desde}
            onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Hasta</label>
          <input type="date" className="campo w-auto py-2" value={hasta}
            onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="relative min-w-48 flex-1 max-w-xs">
          <label className="etiqueta">Buscar</label>
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
          <input className="campo py-2 pl-9" placeholder="Guía, persona o destino"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        {/* Las recibidas son una bandeja de pendientes */}
        {!enviadas && (
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={verEntregadas}
              onChange={(e) => setVerEntregadas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
            />
            Ver entregadas
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : filas.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Truck className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">
            {enviadas ? 'No hay encomiendas en este período' : 'No hay encomiendas pendientes'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">N. de guía</th>
                  <th className="px-4 py-3">Status</th>
                  {!enviadas && <th className="px-4 py-3 text-right">Monto</th>}
                  <th className="px-4 py-3">Persona que envía</th>
                  <th className="px-4 py-3">Persona que recibe</th>
                  <th className="px-4 py-3">{enviadas ? 'Destino' : 'Retirado por'}</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <tr key={f.id} className={`hover:bg-slate-50/70 ${f.entregada_en ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fecha(f.fecha)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800">
                      {f.numero_guia ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {f.status && (
                        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          f.status === 'CONTADO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {f.status === 'CONTADO' ? 'Contado' : 'Por cobrar'}
                        </span>
                      )}
                    </td>
                    {!enviadas && (
                      <td className="px-4 py-2.5 text-right text-slate-700">{colones(f.monto)}</td>
                    )}
                    <td className="px-4 py-2.5 text-slate-700">{f.persona_envia ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{f.persona_recibe ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {(enviadas ? f.destino : f.retirado_por) ?? '—'}
                      {!enviadas && f.entregada_en && (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          entregada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {!enviadas && !f.entregada_en && (
                          <button onClick={() => setEntregando(f)} title="Marcar entregada"
                            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
                            <PackageCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => setEditando(f)} title="Editar"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar la encomienda ${f.numero_guia ?? ''}?`))
                              eliminar.mutate(f.id);
                          }}
                          title="Eliminar"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <ModalEncomienda
          encomienda={editando === 'nueva' ? null : editando}
          direccionPorDefecto={direccion}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cliente.invalidateQueries({ queryKey: ['trali'] });
          }}
        />
      )}

      {entregando && (
        <ModalEntrega
          encomienda={entregando}
          onCerrar={() => setEntregando(null)}
          onGuardado={() => {
            setEntregando(null);
            cliente.invalidateQueries({ queryKey: ['trali'] });
          }}
        />
      )}
    </div>
  );
}

function ModalEncomienda({
  encomienda, direccionPorDefecto, onCerrar, onGuardado,
}: {
  encomienda: Encomienda | null;
  direccionPorDefecto: Direccion;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    fecha: encomienda?.fecha?.slice(0, 10) ?? hoy(),
    direccion: (encomienda?.direccion ?? direccionPorDefecto) as Direccion,
    numeroGuia: encomienda?.numero_guia ?? '',
    status: (encomienda?.status ?? '') as 'CONTADO' | 'POR_COBRAR' | '',
    monto: encomienda?.monto ?? '',
    personaEnvia: encomienda?.persona_envia ?? '',
    personaRecibe: encomienda?.persona_recibe ?? '',
    destino: encomienda?.destino ?? '',
    retiradoPor: encomienda?.retirado_por ?? '',
    notas: encomienda?.notas ?? '',
  });
  const [error, setError] = useState('');

  const enviadas = form.direccion === 'ENVIADA';

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        fecha: form.fecha,
        direccion: form.direccion,
        numeroGuia: form.numeroGuia.trim() || null,
        status: form.status || null,
        monto: form.monto === '' ? null : Number(form.monto),
        personaEnvia: form.personaEnvia.trim() || null,
        personaRecibe: form.personaRecibe.trim() || null,
        destino: form.destino.trim() || null,
        retiradoPor: form.retiradoPor.trim() || null,
        notas: form.notas.trim() || null,
      };
      if (encomienda) return api.patch(`/trali/${encomienda.id}`, cuerpo);
      return api.post('/trali', cuerpo);
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {encomienda ? 'Editar encomienda' : 'Registrar encomienda'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            {([
              ['ENVIADA', 'Enviada a San José'],
              ['RECIBIDA', 'Recibida en San Carlos'],
            ] as const).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setForm({ ...form, direccion: valor })}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                  form.direccion === valor
                    ? 'bg-marca-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Fecha <span className="text-red-500">*</span></label>
              <input type="date" className="campo" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="etiqueta">N. de guía</label>
              <input className="campo" value={form.numeroGuia}
                onChange={(e) => setForm({ ...form, numeroGuia: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Status</label>
              <select className="campo" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="">Sin definir</option>
                <option value="CONTADO">Contado</option>
                <option value="POR_COBRAR">Por cobrar</option>
              </select>
            </div>
            <div>
              <label className="etiqueta">Monto</label>
              <input type="number" min={0} step="0.01" className="campo" value={form.monto}
                placeholder="0.00"
                onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="etiqueta">Persona que envía</label>
            <input className="campo" value={form.personaEnvia}
              onChange={(e) => setForm({ ...form, personaEnvia: e.target.value })} />
          </div>

          <div>
            <label className="etiqueta">Persona que recibe</label>
            <input className="campo" value={form.personaRecibe}
              onChange={(e) => setForm({ ...form, personaRecibe: e.target.value })} />
          </div>

          {enviadas ? (
            <div>
              <label className="etiqueta">Destino</label>
              <input className="campo" value={form.destino}
                onChange={(e) => setForm({ ...form, destino: e.target.value })} />
            </div>
          ) : (
            <div>
              <label className="etiqueta">Retirado por</label>
              <input className="campo" value={form.retiradoPor}
                placeholder="Nombre de quien retiró el paquete"
                onChange={(e) => setForm({ ...form, retiradoPor: e.target.value })} />
            </div>
          )}

          <div>
            <label className="etiqueta">Notas</label>
            <input className="campo" value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => guardar.mutate()} disabled={guardar.isPending || !form.fecha}
              className="boton-primario flex-1">
              {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Solo aplica a las recibidas: al marcarlas salen de la bandeja de pendientes. */
function ModalEntrega({
  encomienda, onCerrar, onGuardado,
}: {
  encomienda: Encomienda;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [retiradoPor, setRetiradoPor] = useState(encomienda.retirado_por ?? '');
  const [error, setError] = useState('');

  const entregar = useMutation({
    mutationFn: () =>
      api.post(`/trali/${encomienda.id}/entregar`, {
        retiradoPor: retiradoPor.trim() || null,
      }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            Marcar como entregada
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-500">
          Guía <strong className="text-slate-800">{encomienda.numero_guia ?? 'sin número'}</strong>
          {encomienda.persona_recibe && ` · para ${encomienda.persona_recibe}`}
        </p>

        <div>
          <label className="etiqueta">Retirado por</label>
          <input
            className="campo"
            value={retiradoPor}
            autoFocus
            placeholder="Nombre de quien retiró el paquete"
            onChange={(e) => setRetiradoPor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') entregar.mutate();
            }}
          />
          <p className="mt-1 text-xs text-slate-500">
            Opcional. Puede anotarlo después editando la encomienda.
          </p>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => entregar.mutate()}
            disabled={entregar.isPending}
            className="boton-primario flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {entregar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Confirmar entrega
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </div>
  );
}