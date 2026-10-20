import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Palmtree, Plus, LoaderCircle, X, Check, Ban, CalendarDays, Pencil, Undo2,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha, fechaHora } from '../lib/formato';
import HistorialVacaciones from '../componentes/HistorialVacaciones';

type Estado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';

interface Solicitud {
  id: number;
  usuario_id: number;
  usuario: string;
  puesto: string;
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

interface Saldo {
  usuario_id: number;
  cedula: string;
  usuario: string;
  puesto: string;
  dias_totales: string;
  tomados: string;
  pendientes: string;
  disponibles: string;
  nota: string | null;
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function dias(valor: string) {
  const n = Number(valor);
  return `${n % 1 === 0 ? n : n.toFixed(1)} día${n === 1 ? '' : 's'}`;
}

function rango(s: Pick<Solicitud, 'fecha_inicio' | 'fecha_fin' | 'medio_dia'>) {
  if (s.medio_dia) return `${fecha(s.fecha_inicio)} · media jornada`;
  if (s.fecha_inicio === s.fecha_fin) return fecha(s.fecha_inicio);
  return `${fecha(s.fecha_inicio)} al ${fecha(s.fecha_fin)}`;
}

export default function Vacaciones() {
  const { puede } = useSesion();
  const administra = puede('vacaciones.gestionar');
  const [pestana, setPestana] = useState<'mias' | 'solicitudes' | 'saldos'>(
    administra ? 'solicitudes' : 'mias'
  );
  const [pidiendo, setPidiendo] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vacaciones</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {administra
              ? 'Solicitudes del personal y días asignados a cada quien'
              : 'Sus solicitudes y en qué quedaron'}
          </p>
        </div>
        <button onClick={() => setPidiendo(true)} className="boton-primario">
          <Plus className="h-4 w-4" />
          Solicitar vacaciones
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {administra && (
          <>
            <Pestana activa={pestana === 'solicitudes'} onClick={() => setPestana('solicitudes')}>
              <CalendarDays className="h-4 w-4" />
              Solicitudes
            </Pestana>
            <Pestana activa={pestana === 'saldos'} onClick={() => setPestana('saldos')}>
              <Palmtree className="h-4 w-4" />
              Días por persona
            </Pestana>
          </>
        )}
        <Pestana activa={pestana === 'mias'} onClick={() => setPestana('mias')}>
          Las mías
        </Pestana>
      </div>

      {pestana === 'mias' && <PanelMias />}
      {pestana === 'solicitudes' && administra && <PanelSolicitudes />}
      {pestana === 'saldos' && administra && <PanelSaldos />}

      {pidiendo && (
        <ModalSolicitar
          onCerrar={() => setPidiendo(false)}
          onGuardado={() => {
            setPidiendo(false);
            setPestana(administra ? 'solicitudes' : 'mias');
          }}
        />
      )}
    </div>
  );
}

function Pestana({
  activa, onClick, children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        activa
          ? 'border-marca-600 text-marca-700'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------- Mis solicitudes

function PanelMias() {
  const cliente = useQueryClient();
  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['vacaciones', 'mias'],
    queryFn: async () => (await api.get<Solicitud[]>('/vacaciones/mias')).data,
  });

  const cancelar = useMutation({
    mutationFn: (id: number) => api.post(`/vacaciones/${id}/cancelar`),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['vacaciones'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
    },
    onError: (e) => alert(mensajeDeError(e)),
  });

  if (isLoading) return <Cargando />;
  if (!filas.length) {
    return <Vacio texto="Todavía no ha pedido vacaciones" />;
  }

  return (
    <div className="space-y-3">
      {filas.map((s) => (
        <div key={s.id} className="tarjeta space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">{rango(s)}</p>
              <p className="text-sm text-slate-500">
                {dias(s.dias)} · pedida el {fecha(s.creado_en)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLOR[s.estado]}`}>
                {ROTULO[s.estado]}
              </span>
              {s.estado === 'PENDIENTE' && (
                <button
                  onClick={() => {
                    if (confirm('¿Retirar esta solicitud?')) cancelar.mutate(s.id);
                  }}
                  className="boton-secundario py-1.5 px-3 text-xs"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Retirar
                </button>
              )}
            </div>
          </div>

          {s.motivo && <p className="text-sm text-slate-600">{s.motivo}</p>}

          {s.modificada === 1 && s.inicio_pedido && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 ring-1 ring-sky-200">
              Había pedido del {fecha(s.inicio_pedido)} al {fecha(s.fin_pedido)}. Administración
              ajustó las fechas.
            </p>
          )}

          {s.nota_resolucion && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {s.nota_resolucion}
            </p>
          )}

          {s.resuelta_en && (
            <p className="text-xs text-slate-400">
              Resuelta por {s.resuelta_por_nombre} el {fechaHora(s.resuelta_en)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------- Solicitudes (administración)

function PanelSolicitudes() {
  const [estado, setEstado] = useState<Estado | ''>('PENDIENTE');
  const [resolviendo, setResolviendo] = useState<Solicitud | null>(null);

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['vacaciones', 'todas', estado],
    queryFn: async () =>
      (await api.get<Solicitud[]>('/vacaciones', { params: { estado: estado || undefined } })).data,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([['PENDIENTE', 'Pendientes'], ['APROBADA', 'Aprobadas'],
           ['RECHAZADA', 'Rechazadas'], ['', 'Todas']] as const).map(([valor, texto]) => (
          <button
            key={texto}
            onClick={() => setEstado(valor as Estado | '')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
              estado === valor
                ? 'bg-marca-600 text-white shadow-sm'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Cargando />
      ) : !filas.length ? (
        <Vacio texto="No hay solicitudes en este estado" />
      ) : (
        filas.map((s) => (
          <div key={s.id} className="tarjeta space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{s.usuario}</p>
                <p className="text-sm text-slate-500">{s.puesto}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLOR[s.estado]}`}>
                {ROTULO[s.estado]}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-medium text-slate-800">{rango(s)}</p>
              <p className="text-sm text-slate-500">{dias(s.dias)}</p>
            </div>

            {s.motivo && <p className="text-sm text-slate-600">{s.motivo}</p>}

            {s.modificada === 1 && s.inicio_pedido && (
              <p className="text-xs text-sky-700">
                Había pedido del {fecha(s.inicio_pedido)} al {fecha(s.fin_pedido)}
              </p>
            )}

            {s.nota_resolucion && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {s.nota_resolucion}
              </p>
            )}

            {s.estado === 'PENDIENTE' ? (
              <button onClick={() => setResolviendo(s)} className="boton-primario py-2 text-sm">
                <Check className="h-4 w-4" />
                Resolver
              </button>
            ) : (
              s.resuelta_en && (
                <p className="text-xs text-slate-400">
                  {s.resuelta_por_nombre} · {fechaHora(s.resuelta_en)}
                </p>
              )
            )}
          </div>
        ))
      )}

      {resolviendo && (
        <ModalResolver solicitud={resolviendo} onCerrar={() => setResolviendo(null)} />
      )}
    </div>
  );
}

// ------------------------------------------------------ Saldos (administración)

function PanelSaldos() {
  const [editando, setEditando] = useState<Saldo | null>(null);
  const [historial, setHistorial] = useState<Saldo | null>(null);
  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['vacaciones', 'saldos'],
    queryFn: async () => (await api.get<Saldo[]>('/vacaciones/saldos')).data,
  });

  if (isLoading) return <Cargando />;

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3 text-right">Asignados</th>
                <th className="px-4 py-3 text-right">Tomados</th>
                <th className="px-4 py-3 text-right">Pendientes</th>
                <th className="px-4 py-3 text-right">Disponibles</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((s) => {
                const disponibles = Number(s.disponibles);
                return (
                  <tr key={s.usuario_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setHistorial(s)}
                        title="Ver su historial de vacaciones"
                        className="font-medium text-slate-800 underline decoration-slate-300
                                   underline-offset-4 transition-colors hover:text-marca-700
                                   hover:decoration-marca-400"
                      >
                        {s.usuario}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{s.puesto}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{Number(s.dias_totales)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{Number(s.tomados)}</td>
                    <td className="px-4 py-2.5 text-right text-amber-700">
                      {Number(s.pendientes) || '—'}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${
                        disponibles < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {disponibles}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setEditando(s)}
                          title="Cambiar los días asignados"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Haga clic en un nombre para ver su historial. Los días tomados se suman de las
        solicitudes aprobadas, así que el disponible nunca se descuadra. Las personas no ven
        su saldo: solo el estado de lo que piden.
      </p>

      {editando && <ModalSaldo saldo={editando} onCerrar={() => setEditando(null)} />}

      {historial && (
        <HistorialVacaciones
          usuarioId={historial.usuario_id}
          nombre={historial.usuario}
          puesto={historial.puesto}
          onCerrar={() => setHistorial(null)}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------ Modales

function ModalSolicitar({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const cliente = useQueryClient();
  const [inicio, setInicio] = useState(hoy());
  const [fin, setFin] = useState(hoy());
  const [medioDia, setMedioDia] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api.post('/vacaciones', {
        fechaInicio: inicio,
        fechaFin: medioDia ? inicio : fin,
        medioDia,
        motivo: motivo.trim() || null,
      }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['vacaciones'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
      onGuardado();
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <Modal titulo="Solicitar vacaciones" onCerrar={onCerrar}>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={medioDia}
            onChange={(e) => setMedioDia(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
          />
          Media jornada de un solo día
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta">{medioDia ? 'Día' : 'Desde'}</label>
            <input
              type="date"
              className="campo"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value);
                if (e.target.value > fin) setFin(e.target.value);
              }}
            />
          </div>
          {!medioDia && (
            <div>
              <label className="etiqueta">Hasta</label>
              <input
                type="date"
                className="campo"
                value={fin}
                min={inicio}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label className="etiqueta">Motivo</label>
          <input
            className="campo"
            value={motivo}
            placeholder="Opcional"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Se cuentan solo los días hábiles: no se descuentan sábados, domingos ni feriados.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending}
            className="boton-primario flex-1"
          >
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Enviar solicitud
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function ModalResolver({ solicitud, onCerrar }: { solicitud: Solicitud; onCerrar: () => void }) {
  const cliente = useQueryClient();
  const [ajustar, setAjustar] = useState(false);
  const [inicio, setInicio] = useState(String(solicitud.fecha_inicio).slice(0, 10));
  const [fin, setFin] = useState(String(solicitud.fecha_fin).slice(0, 10));
  const [medioDia, setMedioDia] = useState(solicitud.medio_dia === 1);
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const resolver = useMutation({
    mutationFn: (estado: 'APROBADA' | 'RECHAZADA') =>
      api.post(`/vacaciones/${solicitud.id}/resolver`, {
        estado,
        fechaInicio: ajustar ? inicio : null,
        fechaFin: ajustar ? (medioDia ? inicio : fin) : null,
        medioDia: ajustar ? medioDia : null,
        nota: nota.trim() || null,
      }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['vacaciones'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
      onCerrar();
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <Modal titulo={`Solicitud de ${solicitud.usuario}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <p className="font-medium text-slate-800">{rango(solicitud)}</p>
          <p className="text-slate-500">{dias(solicitud.dias)}</p>
          {solicitud.motivo && <p className="mt-1 text-slate-600">{solicitud.motivo}</p>}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={ajustar}
            onChange={(e) => setAjustar(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
          />
          Proponer otras fechas
        </label>

        {ajustar && (
          <div className="space-y-3 rounded-lg bg-sky-50 p-3 ring-1 ring-sky-200">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={medioDia}
                onChange={(e) => setMedioDia(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
              />
              Media jornada
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="etiqueta">{medioDia ? 'Día' : 'Desde'}</label>
                <input
                  type="date"
                  className="campo"
                  value={inicio}
                  onChange={(e) => {
                    setInicio(e.target.value);
                    if (e.target.value > fin) setFin(e.target.value);
                  }}
                />
              </div>
              {!medioDia && (
                <div>
                  <label className="etiqueta">Hasta</label>
                  <input
                    type="date"
                    className="campo"
                    value={fin}
                    min={inicio}
                    onChange={(e) => setFin(e.target.value)}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-sky-800">
              Al guardar quedan estas fechas, y a la persona le llega el aviso del cambio.
            </p>
          </div>
        )}

        <div>
          <label className="etiqueta">Nota</label>
          <input
            className="campo"
            value={nota}
            placeholder="Por qué se aprueba, rechaza o se cambian las fechas"
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => resolver.mutate('APROBADA')}
            disabled={resolver.isPending}
            className="boton-primario flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {resolver.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Aprobar
          </button>
          <button
            onClick={() => resolver.mutate('RECHAZADA')}
            disabled={resolver.isPending}
            className="boton-secundario text-red-600 hover:bg-red-50"
          >
            <Ban className="h-4 w-4" />
            Rechazar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalSaldo({ saldo, onCerrar }: { saldo: Saldo; onCerrar: () => void }) {
  const cliente = useQueryClient();
  const [dias, setDias] = useState(String(Number(saldo.dias_totales)));
  const [nota, setNota] = useState(saldo.nota ?? '');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api.put(`/vacaciones/saldos/${saldo.usuario_id}`, {
        dias: Number(dias),
        nota: nota.trim() || null,
      }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['vacaciones'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
      onCerrar();
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <Modal titulo={saldo.usuario} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="etiqueta">Días asignados</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="campo"
            value={dias}
            autoFocus
            onChange={(e) => setDias(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Lleva {Number(saldo.tomados)} tomados, así que quedarían{' '}
            {(Number(dias) || 0) - Number(saldo.tomados)} disponibles.
          </p>
        </div>

        <div>
          <label className="etiqueta">Nota</label>
          <input
            className="campo"
            value={nota}
            placeholder="Período al que corresponden, por ejemplo"
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending}
            className="boton-primario flex-1"
          >
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Piezas

function Modal({
  titulo, onCerrar, children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Cargando() {
  return (
    <div className="grid place-items-center py-16">
      <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="tarjeta grid place-items-center py-16 text-center">
      <Palmtree className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-700">{texto}</p>
    </div>
  );
}
