import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  url_destino: string | null;
  creada_en: string;
  no_leida: number;
  numero_orden: number | null;
}

function haceCuanto(fecha: string) {
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

export default function Campana() {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();
  const cliente = useQueryClient();

  // El contador se refresca solo cada 30 segundos.
  const { data: contador } = useQuery({
    queryKey: ['notificaciones', 'contador'],
    queryFn: async () => (await api.get<{ total: number }>('/notificaciones/contador')).data,
    refetchInterval: 30_000,
  });

  const { data: lista = [] } = useQuery({
    queryKey: ['notificaciones', 'lista'],
    queryFn: async () => (await api.get<Notificacion[]>('/notificaciones')).data,
    enabled: abierto,
  });

  const marcarLeida = useMutation({
    mutationFn: (id: number) => api.post(`/notificaciones/${id}/leer`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const marcarTodas = useMutation({
    mutationFn: () => api.post('/notificaciones/leer-todas'),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  // Cierra al hacer clic fuera
  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (caja.current && !caja.current.contains(evento.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const sinLeer = contador?.total ?? 0;

  function abrir(n: Notificacion) {
    if (n.no_leida) marcarLeida.mutate(n.id);
    setAbierto(false);
    if (n.url_destino) navegar(n.url_destino);
  }

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-600
                   transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center
                           rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white
                           ring-2 ring-white">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl bg-white
                        shadow-lg ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-1
                        duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
            {sinLeer > 0 && (
              <button
                onClick={() => marcarTodas.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-marca-600 hover:text-marca-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {lista.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No hay notificaciones
              </p>
            ) : (
              lista.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors
                             hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.no_leida ? 'bg-marca-600' : 'bg-transparent'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.no_leida ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.mensaje}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{haceCuanto(n.creada_en)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}