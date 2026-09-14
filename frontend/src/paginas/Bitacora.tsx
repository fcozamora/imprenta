import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, LoaderCircle, Download } from 'lucide-react';
import { api } from '../lib/api';
import { fechaHora } from '../lib/formato';

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function haceDias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Bitacora() {
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [usuarioId, setUsuarioId] = useState<number | ''>('');

  const { data: trabajadores = [] } = useQuery({
    queryKey: ['reportes', 'trabajadores', desde, hasta],
    queryFn: async () =>
      (await api.get<any[]>(`/reportes/trabajadores?desde=${desde}&hasta=${hasta}`)).data,
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['reportes', 'bitacora', desde, hasta, usuarioId],
    queryFn: async () => {
      const p = new URLSearchParams({ desde, hasta });
      if (usuarioId) p.set('usuario', String(usuarioId));
      return (await api.get<any[]>(`/reportes/bitacora?${p}`)).data;
    },
  });

  function exportar() {
    const cabecera = ['Trabajador', 'Puesto', 'Orden', 'Cliente', 'Tipos', 'Trabajos', 'Etapas', 'Última vez'];
    const filas = registros.map((r) => [
      r.trabajador, r.puesto, r.numero_orden, r.cliente,
      r.tipos_trabajo, r.trabajos, r.etapas_marcadas, fechaHora(r.ultima_vez),
    ]);
    const csv = [cabecera, ...filas]
      .map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    // El BOM hace que Excel abra las tildes correctamente.
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `bitacora_${desde}_${hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bitácora de trabajo</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {registros.length} órdenes trabajadas · el detalle de etapas se ve dentro de cada orden
          </p>
        </div>
        <button onClick={exportar} disabled={registros.length === 0} className="boton-secundario">
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
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
        <div>
          <label className="etiqueta">Trabajador</label>
          <select className="campo w-auto py-2" value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {trabajadores.map((t) => (
              <option key={t.id} value={t.id}>{t.trabajador}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas de resumen: al hacer clic filtran la tabla */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {trabajadores.map((t) => (
          <button key={t.id} onClick={() => setUsuarioId(usuarioId === t.id ? '' : t.id)}
            className={`tarjeta text-left transition-all hover:shadow-md ${
              usuarioId === t.id ? 'ring-2 ring-marca-500' : ''
            }`}>
            <p className="font-medium text-slate-900">{t.trabajador}</p>
            <p className="text-xs text-slate-500">{t.puesto}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-marca-700">{t.ordenes}</span>
              <span className="text-xs text-slate-500">
                órdenes · {t.etapas_marcadas} etapas
              </span>
            </div>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : registros.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">Sin actividad en este período</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Trabajos</th>
                  <th className="px-4 py-3 text-right">Etapas</th>
                  <th className="px-4 py-3">Última vez</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r, i) => (
                  <tr key={`${r.usuario_id}-${r.orden_id}-${i}`} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{r.trabajador}</p>
                      <p className="text-xs text-slate-500">{r.puesto}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/ordenes/${r.orden_id}`}
                        className="font-semibold text-marca-700 hover:underline"
                      >
                        #{r.numero_orden}
                      </Link>
                      <p className="text-xs text-slate-500">{r.cliente}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-slate-800">{r.trabajos}</p>
                      <p className="text-xs text-slate-500">{r.tipos_trabajo}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {r.etapas_marcadas}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {fechaHora(r.ultima_vez)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}