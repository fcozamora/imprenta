import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shirt, LoaderCircle, MessageCircle, Scissors } from 'lucide-react';
import { api } from '../lib/api';
import { useConfeccion } from '../lib/consultas';
import { useSesion } from '../lib/sesion';
import { fechaCorta, avisoEntrega, enlaceWhatsapp } from '../lib/formato';

export default function ConfeccionTextil() {
  const { puede } = useSesion();
  const [costureraId, setCostureraId] = useState<number | ''>('');
  const puedeContactar = puede('clientes.contactar');

  const { data: costureras = [] } = useQuery({
    queryKey: ['costureras'],
    queryFn: async () => (await api.get<any[]>('/costureras')).data,
  });

  const { data: filas = [], isLoading } = useConfeccion(
    costureraId ? Number(costureraId) : undefined
  );

  // Cuántos trabajos tiene cada costurera en este momento
  const conteo = filas.reduce<Record<number, number>>((acc, f) => {
    if (f.costurera_id) acc[f.costurera_id] = (acc[f.costurera_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Confección textil</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {isLoading
            ? 'Cargando...'
            : `${filas.length} trabajo${filas.length === 1 ? '' : 's'} en manos de costureras`}
        </p>
      </div>

      {/* Filtro por costurera, con el conteo de cada una */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCostureraId('')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
            costureraId === ''
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        {costureras.map((c) => (
          <button
            key={c.id}
            onClick={() => setCostureraId(costureraId === c.id ? '' : c.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                        transition-all active:scale-95 ${
                          costureraId === c.id
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                        }`}
          >
            {c.nombre}
            {conteo[c.id] > 0 && (
              <span className={`rounded-full px-1.5 text-xs ${
                costureraId === c.id ? 'bg-pink-500' : 'bg-slate-100 text-slate-600'
              }`}>
                {conteo[c.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
        </div>
      ) : filas.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Shirt className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay trabajos en confección</p>
          <p className="mt-1 text-sm text-slate-500">
            Aparecen aquí cuando se marca la sublimación y se asigna una costurera.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Trabajo</th>
                  <th className="px-4 py-3">Costurera</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => {
                  const aviso = avisoEntrega(f.dias_restantes);
                  return (
                    <tr
                      key={f.linea_id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        f.por_vencer ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <Link
                          to={`/ordenes/${f.orden_id}`}
                          className="font-semibold text-marca-700 hover:underline"
                        >
                          #{f.numero_orden}
                        </Link>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{f.cliente}</p>
                        {f.nombre_comercial && (
                          <p className="text-xs text-slate-500">{f.nombre_comercial}</p>
                        )}
                        {puedeContactar && f.telefono_wa && (
                          <a
                            href={enlaceWhatsapp(f.telefono_wa)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {f.telefono}
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-900">{f.nombre_trabajo}</p>
                        <p className="text-xs text-slate-500">{f.cantidad} unidades</p>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="inline-flex items-center gap-1.5 font-medium text-pink-700">
                          <Scissors className="h-3.5 w-3.5 shrink-0" />
                          {f.costurera}
                        </p>
                        {f.costurera_telefono && (
                          <a
                            href={enlaceWhatsapp(f.costurera_telefono)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 block text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            {f.costurera_telefono}
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {f.etapa}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-700">{fechaCorta(f.fecha_entrega)}</p>
                        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${aviso.clase}`}>
                          {aviso.texto}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}