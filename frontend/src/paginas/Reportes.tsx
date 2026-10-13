import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, TriangleAlert, Download } from 'lucide-react';
import { api } from '../lib/api';
import { numero } from '../lib/formato';

function hoy() { return new Date().toISOString().slice(0, 10); }
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Reportes() {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());

  const rango = `desde=${desde}&hasta=${hasta}`;

  const tipos = useQuery({
    queryKey: ['reportes', 'tipos', desde, hasta],
    queryFn: async () => (await api.get<any[]>(`/reportes/tipos?${rango}`)).data,
  });

  const vendedores = useQuery({
    queryKey: ['reportes', 'vendedores', desde, hasta],
    queryFn: async () => (await api.get<any[]>(`/reportes/vendedores?${rango}`)).data,
  });

  const estancadas = useQuery({
    queryKey: ['reportes', 'estancadas'],
    queryFn: async () => (await api.get<any[]>('/reportes/estancadas?dias=7')).data,
  });

  function exportar(nombre: string, filas: any[]) {
    if (!filas.length) return;
    const cabecera = Object.keys(filas[0]);
    const csv = [cabecera, ...filas.map((f) => cabecera.map((c) => f[c]))]
      .map((f) => f.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombre}_${desde}_${hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>

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
      </div>

      {/* Trabajos estancados */}
      {(estancadas.data?.length ?? 0) > 0 && (
        <div className="tarjeta border-l-4 border-l-red-500">
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-red-500" />
            <h2 className="font-semibold text-slate-900">
              Trabajos sin avance ({estancadas.data!.length})
            </h2>
          </div>
          <div className="space-y-1.5 text-sm">
            {estancadas.data!.slice(0, 10).map((e) => (
              <div key={e.linea_id} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-1.5">
                <div>
                  <Link to={`/ordenes/${e.orden_id}`} className="font-semibold text-marca-700 hover:underline">
                    #{e.numero_orden}
                  </Link>
                  <span className="ml-2 text-slate-600">{e.cliente}</span>
                  <span className="ml-2 text-xs text-slate-400">{e.nombre_trabajo}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {e.dias_sin_movimiento} días
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">{e.etapa}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Producción por tipo de trabajo" consulta={tipos}
          onExportar={() => exportar('tipos', tipos.data ?? [])}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Trabajos</th>
                <th className="pb-2 text-right">Unidades</th>
                <th className="pb-2 text-right">En proceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tipos.data?.map((t) => (
                <tr key={t.tipo_trabajo}>
                  <td className="py-2 font-medium text-slate-800">{t.tipo_trabajo}</td>
                  <td className="py-2 text-right text-slate-600">{numero(t.trabajos)}</td>
                  <td className="py-2 text-right text-slate-600">{numero(t.unidades)}</td>
                  <td className="py-2 text-right">
                    <span className={t.en_proceso > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>
                      {t.en_proceso}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Órdenes por vendedor" consulta={vendedores}
          onExportar={() => exportar('vendedores', vendedores.data ?? [])}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-2">Vendedor</th>
                <th className="pb-2 text-right">Órdenes</th>
                <th className="pb-2 text-right">Clientes</th>
                <th className="pb-2 text-right">Abiertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vendedores.data?.map((v) => (
                <tr key={v.vendedor}>
                  <td className="py-2 font-medium text-slate-800">{v.vendedor}</td>
                  <td className="py-2 text-right text-slate-600">{numero(v.ordenes)}</td>
                  <td className="py-2 text-right text-slate-600">{numero(v.clientes)}</td>
                  <td className="py-2 text-right text-slate-600">{numero(v.abiertas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  titulo, consulta, onExportar, children,
}: {
  titulo: string; consulta: any; onExportar: () => void; children: React.ReactNode;
}) {
  return (
    <div className="tarjeta">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        <button onClick={onExportar} disabled={!consulta.data?.length}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
          <Download className="h-4 w-4" />
        </button>
      </div>
      {consulta.isLoading ? (
        <div className="grid place-items-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : !consulta.data?.length ? (
        <p className="py-8 text-center text-sm text-slate-400">Sin datos en este período</p>
      ) : children}
    </div>
  );
}