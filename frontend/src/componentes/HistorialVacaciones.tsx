import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { fecha, fechaHora } from '../lib/formato';

type Estado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';

interface Solicitud {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  medio_dia: number;
  dias: string;
  motivo: string | null;
  estado: Estado;
  modificada: number;
  inicio_pedido: string | null;
  fin_pedido: string | null;
  resuelta_por_nombre: string | null;
  resuelta_en: string | null;
  nota_resolucion: string | null;
  creado_en: string;
}

const COLOR: Record<Estado, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-slate-200 text-slate-600',
};

const ROTULO: Record<Estado, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Retirada',
};

function rango(s: Solicitud) {
  if (s.medio_dia) return `${fecha(s.fecha_inicio)} · media jornada`;
  if (s.fecha_inicio === s.fecha_fin) return fecha(s.fecha_inicio);
  return `${fecha(s.fecha_inicio)} al ${fecha(s.fecha_fin)}`;
}

/**
 * Historial de vacaciones de una persona, con su saldo arriba.
 * Lo usan la pantalla de Vacaciones y la de Administracion, para no tener
 * la misma lista escrita dos veces.
 */
export default function HistorialVacaciones({
  usuarioId, nombre, puesto, onCerrar,
}: {
  usuarioId: number;
  nombre: string;
  puesto?: string | null;
  onCerrar: () => void;
}) {
  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['vacaciones', 'de', usuarioId],
    queryFn: async () =>
      (await api.get<Solicitud[]>('/vacaciones', { params: { usuarioId } })).data,
  });

  const { data: saldos = [] } = useQuery({
    queryKey: ['vacaciones', 'saldos'],
    queryFn: async () => (await api.get<any[]>('/vacaciones/saldos')).data,
  });

  const saldo = saldos.find((s) => s.usuario_id === usuarioId);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{nombre}</h2>
            <p className="text-sm text-slate-500">
              Historial de vacaciones{puesto ? ` · ${puesto}` : ''}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {saldo && (
          <div className="mb-4 grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-center ring-1 ring-slate-200">
            {([
              ['Asignados', saldo.dias_totales, 'text-slate-900'],
              ['Tomados', saldo.tomados, 'text-slate-900'],
              ['Pendientes', saldo.pendientes, 'text-amber-700'],
              ['Disponibles', saldo.disponibles, 'text-emerald-700'],
            ] as const).map(([rotulo, valor, color]) => (
              <div key={rotulo}>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{rotulo}</p>
                <p className={`text-lg font-semibold ${color}`}>{Number(valor)}</p>
              </div>
            ))}
          </div>
        )}

        {saldo?.nota && (
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {saldo.nota}
          </p>
        )}

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <LoaderCircle className="h-5 w-5 animate-spin text-marca-600" />
          </div>
        ) : !solicitudes.length ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Esta persona nunca ha pedido vacaciones.
          </p>
        ) : (
          <ul className="space-y-2">
            {solicitudes.map((s) => (
              <li key={s.id} className="rounded-lg px-3 py-2 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{rango(s)}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLOR[s.estado]}`}>
                    {ROTULO[s.estado]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {Number(s.dias)} día{Number(s.dias) === 1 ? '' : 's'} · pedida el{' '}
                  {fecha(s.creado_en)}
                </p>
                {s.motivo && <p className="mt-1 text-sm text-slate-600">{s.motivo}</p>}
                {s.modificada === 1 && s.inicio_pedido && (
                  <p className="mt-1 text-xs text-sky-700">
                    Había pedido del {fecha(s.inicio_pedido)} al {fecha(s.fin_pedido)}
                  </p>
                )}
                {s.nota_resolucion && (
                  <p className="mt-1 text-sm text-slate-600">{s.nota_resolucion}</p>
                )}
                {s.resuelta_en && (
                  <p className="mt-1 text-xs text-slate-400">
                    {s.resuelta_por_nombre} · {fechaHora(s.resuelta_en)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
