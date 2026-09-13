import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { fechaHora } from '../lib/formato';
import { useSesion } from '../lib/sesion';

export default function Notificaciones() {
  const [pestana, setPestana] = useState<'todas' | 'whatsapp'>('todas');
  const { puede } = useSesion();
  const verWhatsapp = puede('ordenes.ver_todas');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Notificaciones</h1>

      {verWhatsapp && (
        <div className="flex gap-1 border-b border-slate-200">
          <button onClick={() => setPestana('todas')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              pestana === 'todas' ? 'border-marca-600 text-marca-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <Bell className="h-4 w-4" />
            Avisos
          </button>
          <button onClick={() => setPestana('whatsapp')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              pestana === 'whatsapp' ? 'border-marca-600 text-marca-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <MessageCircle className="h-4 w-4" />
            Mensajes por enviar
          </button>
        </div>
      )}

      {pestana === 'todas' ? <ListaAvisos /> : <ColaWhatsapp />}
    </div>
  );
}

function ListaAvisos() {
  const navegar = useNavigate();
  const cliente = useQueryClient();

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['notificaciones', 'lista'],
    queryFn: async () => (await api.get<any[]>('/notificaciones')).data,
  });

  const leer = useMutation({
    mutationFn: (id: number) => api.post(`/notificaciones/${id}/leer`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const leerTodas = useMutation({
    mutationFn: () => api.post('/notificaciones/leer-todas'),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const sinLeer = lista.filter((n) => n.no_leida).length;

  if (isLoading) {
    return <div className="grid place-items-center py-16">
      <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
    </div>;
  }

  return (
    <div className="space-y-3">
      {sinLeer > 0 && (
        <button onClick={() => leerTodas.mutate()} className="boton-secundario py-2 text-sm">
          <CheckCheck className="h-4 w-4" />
          Marcar todas como leídas ({sinLeer})
        </button>
      )}

      {lista.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Bell className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay notificaciones</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {lista.map((n) => (
            <button key={n.id}
              onClick={() => {
                if (n.no_leida) leer.mutate(n.id);
                if (n.url_destino) navegar(n.url_destino);
              }}
              className="flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.no_leida ? 'bg-marca-600' : 'bg-transparent'}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.no_leida ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                  {n.titulo}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{n.mensaje}</p>
                <p className="mt-1 text-[11px] text-slate-400">{fechaHora(n.creada_en)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColaWhatsapp() {
  const cliente = useQueryClient();

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['whatsapp', 'pendientes'],
    queryFn: async () => (await api.get<any[]>('/whatsapp/pendientes')).data,
  });

  const marcar = useMutation({
    mutationFn: ({ id, accion }: { id: number; accion: 'enviado' | 'cancelar' }) =>
      api.post(`/whatsapp/${id}/${accion}`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['whatsapp'] }),
    onError: (e) => alert(mensajeDeError(e)),
  });

  if (isLoading) {
    return <div className="grid place-items-center py-16">
      <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
    </div>;
  }

  if (mensajes.length === 0) {
    return (
      <div className="tarjeta grid place-items-center py-16 text-center">
        <MessageCircle className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-700">No hay mensajes pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">
        Al abrir el enlace, WhatsApp se abre con el mensaje ya escrito. Después márquelo como enviado.
      </p>

      {mensajes.map((m) => (
        <div key={m.id} className="tarjeta">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {m.plantilla === 'ORDEN_CREADA' ? 'Orden creada' : 'Orden lista'}
                </span>
                {m.numero_orden && (
                  <span className="text-sm font-semibold text-marca-700">#{m.numero_orden}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">{m.cliente ?? m.telefono}</p>
              <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {m.mensaje}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">{fechaHora(m.creado_en)}</p>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
              <a href={m.enlace} target="_blank" rel="noreferrer" className="boton-primario py-1.5 px-3 text-xs">
                <Send className="h-3.5 w-3.5" />
                Abrir WhatsApp
              </a>
              <button onClick={() => marcar.mutate({ id: m.id, accion: 'enviado' })}
                className="boton-secundario py-1.5 px-3 text-xs">
                <CheckCheck className="h-3.5 w-3.5" />
                Ya lo envié
              </button>
              <button onClick={() => marcar.mutate({ id: m.id, accion: 'cancelar' })}
                className="py-1 text-xs text-slate-400 hover:text-red-600">
                <X className="inline h-3 w-3" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}