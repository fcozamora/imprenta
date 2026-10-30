import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, LoaderCircle, MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha, enlaceWhatsapp } from '../lib/formato';

export default function Clientes() {
  const { puede } = useSesion();
  const [busqueda, setBusqueda] = useState('');
  const contactar = puede('clientes.contactar');

  // Sin búsqueda muestra los clientes con actividad más reciente.
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', busqueda],
    queryFn: async () =>
      (await api.get<any[]>(`/clientes?q=${encodeURIComponent(busqueda.trim())}`)).data,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {isLoading
            ? 'Cargando...'
            : busqueda.trim()
              ? `${clientes.length} coincidencia${clientes.length === 1 ? '' : 's'}`
              : `${clientes.length} clientes recientes`}
        </p>
      </div>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="campo pl-9"
          autoFocus
          value={busqueda}
          placeholder="Cédula, nombre, nombre comercial o teléfono"
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">
            {busqueda.trim() ? 'No se encontraron clientes' : 'Todavía no hay clientes'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Los clientes se registran al ingresar una orden nueva.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3 text-right">Órdenes</th>
                  <th className="px-4 py-3">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.cedula}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/clientes/${c.id}`}
                        className="font-medium text-marca-700 hover:underline"
                      >
                        {c.nombre}
                      </Link>
                      {c.nombre_comercial && (
                        <p className="text-xs text-slate-500">{c.nombre_comercial}</p>
                      )}
                      {c.expediente && (
                        <p className="text-xs text-slate-500">
                          Expediente <span className="font-mono">{c.expediente}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {contactar && c.telefono_wa ? (
                        <a
                          href={enlaceWhatsapp(c.telefono_wa)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {c.telefono}
                        </a>
                      ) : (
                        <span className="text-slate-600">{c.telefono}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.total_ordenes}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fecha(c.ultima_orden)}</td>
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