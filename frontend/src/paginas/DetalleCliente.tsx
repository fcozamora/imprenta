import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, LoaderCircle, MessageCircle, Package, FileText, Mail, IdCard, Pencil,
} from 'lucide-react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha, enlaceWhatsapp } from '../lib/formato';
import { useState } from 'react';
import EditarCliente from '../componentes/EditarCliente';

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
    return (
      <div className="grid place-items-center py-20">
        <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
      </div>
    );
  }

  const c = cliente.data;
  const lista = ordenes.data ?? [];
  const abiertas = lista.filter((o: any) => o.estado === 'ABIERTA').length;
  const [editando, setEditando] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navegar(-1)}
            aria-label="Volver"
            className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg text-slate-500
                       transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{c.nombre}</h1>
            {c.nombre_comercial && <p className="text-sm text-slate-500">{c.nombre_comercial}</p>}
          </div>
        </div>

        {puede('clientes.gestionar') && (
          <button onClick={() => setEditando(true)} className="boton-secundario">
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>

      {/* ---------- Datos ---------- */}
      <div className="tarjeta">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
              <IdCard className="h-3.5 w-3.5" /> Cédula
            </p>
            <p className="mt-0.5 font-mono text-slate-900">{c.cedula}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
              <MessageCircle className="h-3.5 w-3.5" /> Teléfono
            </p>
            <p className="mt-0.5">
              {puede('clientes.contactar') && c.telefono_wa ? (
                <a
                  href={enlaceWhatsapp(c.telefono_wa)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {c.telefono}
                </a>
              ) : (
                <span className="text-slate-900">{c.telefono}</span>
              )}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Email de facturación
            </p>
            <p className="mt-0.5 truncate text-slate-900">{c.email_facturacion ?? '—'}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-6 border-t border-slate-100 pt-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Órdenes</p>
            <p className="text-lg font-bold text-slate-900">{lista.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Abiertas</p>
            <p className={`text-lg font-bold ${abiertas > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {abiertas}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Productos</p>
            <p className="text-lg font-bold text-slate-900">{productos.data?.length ?? 0}</p>
          </div>
        </div>

        {c.notas && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{c.notas}</p>
        )}
      </div>

      {/* ---------- Productos ---------- */}
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
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {productos.data.map((p) => (
              <div key={p.id} className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <p className="truncate font-medium text-slate-800">{p.nombre_trabajo}</p>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{p.tipo_trabajo}</span>
                  <span className="font-semibold text-slate-600">{p.veces_solicitado}×</span>
                </div>
                {p.perfil_impresion && (
                  <p className="mt-0.5 text-xs text-slate-400">Perfil: {p.perfil_impresion}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">Último: {fecha(p.ultima_fecha)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Historial de órdenes ---------- */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Órdenes de trabajo ({lista.length})</h2>
        </div>

        {ordenes.isLoading ? (
          <div className="grid place-items-center py-12">
            <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Sin órdenes registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                            <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Orden</th>
                  <th className="px-5 py-3">Trabajo</th>
                  <th className="px-5 py-3">Vendedor</th>
                  <th className="px-5 py-3">Ingreso</th>
                  <th className="px-5 py-3">Entrega</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <Link
                        to={`/ordenes/${o.id}`}
                        className="font-semibold text-marca-700 hover:underline"
                      >
                        #{o.numero_orden}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-800">{o.trabajos ?? '—'}</p>
                      <p className="text-xs text-slate-400">{o.tipos_trabajo}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{o.vendedor}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fecha(o.fecha_ingreso)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fecha(o.fecha_entrega)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        o.estado === 'ABIERTA' ? 'bg-blue-100 text-blue-700'
                        : o.estado === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                      }`}>
                        {o.estado.charAt(0) + o.estado.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editando && <EditarCliente cliente={c} onCerrar={() => setEditando(false)} />}
    </div>
  );
}