import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, MessageCircle, Package, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha, enlaceWhatsapp } from '../lib/formato';

export default function DetalleCliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { puede } = useSesion();

  const cliente = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => (await api.get(`/clientes/${id}`)).data,
  });

  const productos = useQuery({
    queryKey: ['cliente', id, 'productos'],
    queryFn: async () => (await api.get<any[]>(`/clientes/${id}/productos`)).data,
  });

  const ordenes = useQuery({
    queryKey: ['cliente', id, 'ordenes'],
    queryFn: async () => (await api.get<any[]>(`/clientes/${id}/ordenes`)).data,
  });

  if (cliente.isLoading) {
    return <div className="grid place-items-center py-20">
      <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
    </div>;
  }

  const c = cliente.data;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start gap-3">
        <button onClick={() => navegar(-1)} aria-label="Volver"
          className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{c.nombre}</h1>
          {c.nombre_comercial && <p className="text-sm text-slate-500">{c.nombre_comercial}</p>}
        </div>
      </div>

      <div className="tarjeta">
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Cédula</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{c.cedula}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Teléfono</dt>
            <dd className="mt-0.5">
              {puede('clientes.contactar') && c.telefono_wa ? (
                <a href={enlaceWhatsapp(c.telefono_wa)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {c.telefono}
                </a>
              ) : (
                <span className="text-slate-900">{c.telefono}</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Email de facturación</dt>
            <dd className="mt-0.5 text-slate-900">{c.email_facturacion ?? '—'}</dd>
          </div>
        </dl>
        {c.notas && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{c.notas}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Productos del cliente */}
        <div className="tarjeta">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              Productos ({productos.data?.length ?? 0})
            </h2>
          </div>
          {productos.isLoading ? (
            <div className="grid place-items-center py-8">
              <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : !productos.data?.length ? (
            <p className="py-8 text-center text-sm text-slate-400">Sin productos registrados</p>
          ) : (
            <ul className="divide-y divide-slate-50 text-sm">
              {productos.data.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{p.nombre_trabajo}</p>
                    <p className="text-xs text-slate-500">{p.tipo_trabajo}</p>
                    {p.perfil_impresion && (
                      <p className="text-xs text-slate-400">Perfil: {p.perfil_impresion}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-700">
                      {p.veces_solicitado}×
                    </p>
                    <p className="text-xs text-slate-400">{fecha(p.ultima_fecha)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Historial de órdenes */}
        <div className="tarjeta">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              Órdenes ({ordenes.data?.length ?? 0})
            </h2>
          </div>
          {ordenes.isLoading ? (
            <div className="grid place-items-center py-8">
              <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : !ordenes.data?.length ? (
            <p className="py-8 text-center text-sm text-slate-400">Sin órdenes registradas</p>
          ) : (
            <ul className="divide-y divide-slate-50 text-sm">
              {ordenes.data.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link to={`/ordenes/${o.id}`} className="font-semibold text-marca-700 hover:underline">
                      #{o.numero_orden}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{o.tipos_trabajo}</p>
                    <p className="text-xs text-slate-400">{o.vendedor}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      o.estado === 'ABIERTA' ? 'bg-blue-100 text-blue-700'
                      : o.estado === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                    }`}>{o.estado.toLowerCase()}</span>
                    <p className="mt-0.5 text-xs text-slate-400">{fecha(o.fecha_ingreso)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}