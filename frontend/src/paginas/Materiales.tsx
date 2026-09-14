import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Trash2, LoaderCircle, X, Send } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fechaHora } from '../lib/formato';

interface Solicitud {
  id: number;
  estado: string;
  nota: string | null;
  creado_en: string;
  atendida_en: string | null;
  solicitante: string;
  puesto: string;
  atendida_por: string | null;
  total_lineas: number;
}

const ESTADOS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  COMPRADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-red-100 text-red-700',
};

export default function Materiales() {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const atiende = puede('materiales.atender');

  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['materiales', atiende, filtroEstado],
    queryFn: async () => {
      const ruta = atiende
        ? `/materiales${filtroEstado ? `?estado=${filtroEstado}` : ''}`
        : '/materiales/mias';
      return (await api.get<Solicitud[]>(ruta)).data;
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.post(`/materiales/${id}/estado`, { estado }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['materiales'] }),
    onError: (e) => alert(mensajeDeError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {atiende ? 'Solicitudes de material' : 'Mis solicitudes'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{solicitudes.length} solicitudes</p>
        </div>
        {puede('materiales.solicitar') && (
          <button onClick={() => setNueva(true)} className="boton-primario">
            <Plus className="h-4 w-4" />
            Solicitar material
          </button>
        )}
      </div>

      {atiende && (
        <div className="flex gap-1">
          {['', 'PENDIENTE', 'APROBADA', 'COMPRADA', 'RECHAZADA'].map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroEstado === e ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}>
              {e === '' ? 'Todas' : e.charAt(0) + e.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay solicitudes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {solicitudes.map((s) => (
            <div key={s.id} className="tarjeta">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[s.estado]}`}>
                      {s.estado.charAt(0) + s.estado.slice(1).toLowerCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {s.total_lineas} producto{s.total_lineas === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.solicitante} ({s.puesto}) · {fechaHora(s.creado_en)}
                  </p>
                  {s.nota && <p className="mt-1 text-sm text-slate-600">{s.nota}</p>}
                  {s.atendida_por && (
                    <p className="mt-1 text-xs text-slate-400">
                      Atendida por {s.atendida_por} · {fechaHora(s.atendida_en)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setAbierta(abierta === s.id ? null : s.id)}
                    className="boton-secundario py-1.5 px-3 text-xs">
                    {abierta === s.id ? 'Ocultar' : 'Ver productos'}
                  </button>
                  {atiende && s.estado === 'PENDIENTE' && (
                    <>
                      <button onClick={() => cambiarEstado.mutate({ id: s.id, estado: 'COMPRADA' })}
                        className="boton-primario py-1.5 px-3 text-xs">Marcar comprada</button>
                      <button onClick={() => cambiarEstado.mutate({ id: s.id, estado: 'RECHAZADA' })}
                        className="boton-secundario py-1.5 px-3 text-xs">Rechazar</button>
                    </>
                  )}
                </div>
              </div>

              {abierta === s.id && <LineasSolicitud id={s.id} />}
            </div>
          ))}
        </div>
      )}

      {nueva && (
        <ModalSolicitud onCerrar={() => setNueva(false)} onGuardado={() => {
          setNueva(false);
          cliente.invalidateQueries({ queryKey: ['materiales'] });
          cliente.invalidateQueries({ queryKey: ['notificaciones'] });
        }} />
      )}
    </div>
  );
}

function LineasSolicitud({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['materiales', id],
    queryFn: async () => (await api.get(`/materiales/${id}`)).data,
  });

  if (isLoading) {
    return <div className="mt-3 grid place-items-center py-4">
      <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
    </div>;
  }

  return (
    <table className="mt-3 w-full border-t border-slate-100 pt-2 text-sm">
      <tbody className="divide-y divide-slate-50">
        {data?.lineas.map((l: any) => (
          <tr key={l.linea}>
            <td className="w-20 py-1.5 font-medium text-slate-700">{l.cantidad}</td>
            <td className="py-1.5 text-slate-600">{l.producto}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModalSolicitud({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const [nota, setNota] = useState('');
  const [lineas, setLineas] = useState([{ cantidad: '', producto: '' }]);
  const [error, setError] = useState('');
  const contenedor = useRef<HTMLDivElement>(null);

  function actualizar(i: number, campo: 'cantidad' | 'producto', valor: string) {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  // Enter en la última línea agrega otra: el formulario crece mientras se escribe.
  function alPresionar(evento: React.KeyboardEvent, i: number) {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    if (i === lineas.length - 1) {
      setLineas((ls) => [...ls, { cantidad: '', producto: '' }]);
      setTimeout(() => {
        const campos = contenedor.current?.querySelectorAll('input');
        (campos?.[campos.length - 2] as HTMLInputElement)?.focus();
      }, 0);
    }
  }

  const enviar = useMutation({
    mutationFn: () => api.post('/materiales', {
      nota: nota.trim() || undefined,
      lineas: lineas.filter((l) => l.producto.trim()).map((l) => ({
        cantidad: l.cantidad.trim() || '1',
        producto: l.producto.trim(),
      })),
    }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const validas = lineas.filter((l) => l.producto.trim()).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Solicitud de material</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Escriba y presione Enter para agregar otra línea.
          </p>

          <div ref={contenedor} className="space-y-2">
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className="w-24">Cantidad</span>
              <span className="flex-1">Producto</span>
              <span className="w-8" />
            </div>

            {lineas.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="campo w-24 py-2" value={l.cantidad} placeholder="1"
                  onChange={(e) => actualizar(i, 'cantidad', e.target.value)}
                  onKeyDown={(e) => alPresionar(e, i)} />
                <input className="campo flex-1 py-2" value={l.producto} placeholder="Nombre del producto"
                  autoFocus={i === 0}
                  onChange={(e) => actualizar(i, 'producto', e.target.value)}
                  onKeyDown={(e) => alPresionar(e, i)} />
                <button type="button" disabled={lineas.length === 1}
                  onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setLineas((ls) => [...ls, { cantidad: '', producto: '' }])}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-marca-400 hover:text-marca-600">
            <Plus className="inline h-4 w-4" /> Agregar línea
          </button>

          <div>
            <label className="etiqueta">Nota</label>
            <input className="campo" value={nota} placeholder="Opcional"
              onChange={(e) => setNota(e.target.value)} />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => enviar.mutate()} disabled={enviar.isPending || validas === 0}
              className="boton-primario flex-1">
              {enviar.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar solicitud
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}