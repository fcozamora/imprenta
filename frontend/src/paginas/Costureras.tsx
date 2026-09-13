import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Scissors, Plus, LoaderCircle, X, Pencil, CircleSlash, CircleCheck } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';

interface Costurera {
  id: number;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: number;
  trabajos: number;
}

export default function Costureras() {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const gestiona = puede('costureras.gestionar');

  const [editando, setEditando] = useState<Costurera | 'nueva' | null>(null);

  const { data: costureras = [], isLoading } = useQuery({
    queryKey: ['costureras', 'todas'],
    queryFn: async () => (await api.get<Costurera[]>('/costureras?todas=true')).data,
  });

  const { data: carga = [] } = useQuery({
    queryKey: ['costureras', 'carga'],
    queryFn: async () => (await api.get<any[]>('/costureras/carga')).data,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/costureras/${id}`, { activo }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['costureras'] }),
    onError: (e) => alert(mensajeDeError(e)),
  });

  const porId = new Map(carga.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Costureras</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {costureras.filter((c) => c.activo).length} activas
          </p>
        </div>
        {gestiona && (
          <button onClick={() => setEditando('nueva')} className="boton-primario">
            <Plus className="h-4 w-4" />
            Agregar costurera
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : costureras.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Scissors className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay costureras registradas</p>
          <p className="mt-1 text-sm text-slate-500">
            Los trabajos textiles no podrán pasar a confección sin al menos una.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {costureras.map((c) => {
            const datos = porId.get(c.id);
            return (
              <div key={c.id} className={`tarjeta ${!c.activo ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{c.nombre}</h3>
                    {c.telefono && <p className="text-sm text-slate-500">{c.telefono}</p>}
                    {!c.activo && (
                      <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        inactiva
                      </span>
                    )}
                  </div>
                  {gestiona && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => setEditando(c)} title="Editar"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => cambiarEstado.mutate({ id: c.id, activo: !c.activo })}
                        title={c.activo ? 'Desactivar' : 'Activar'}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                        {c.activo ? <CircleSlash className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {datos && (
                  <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2 text-xs">
                    <div>
                      <p className="text-slate-400">En proceso</p>
                      <p className={`font-semibold ${datos.en_proceso > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {datos.en_proceso ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Terminados</p>
                      <p className="font-semibold text-slate-600">{datos.terminados ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Piezas</p>
                      <p className="font-semibold text-slate-600">{datos.piezas ?? 0}</p>
                    </div>
                  </div>
                )}

                {c.notas && <p className="mt-2 text-xs text-slate-500">{c.notas}</p>}
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <ModalCostureraAdmin
          costurera={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cliente.invalidateQueries({ queryKey: ['costureras'] });
          }}
        />
      )}
    </div>
  );
}

function ModalCostureraAdmin({
  costurera, onCerrar, onGuardado,
}: {
  costurera: Costurera | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    nombre: costurera?.nombre ?? '',
    telefono: costurera?.telefono ?? '',
    notas: costurera?.notas ?? '',
  });
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        notas: form.notas.trim() || null,
      };
      if (costurera) return api.patch(`/costureras/${costurera.id}`, cuerpo);
      return api.post('/costureras', cuerpo);
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {costurera ? 'Editar costurera' : 'Nueva costurera'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
            <input className="campo" value={form.nombre} autoFocus
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="etiqueta">Teléfono</label>
            <input className="campo" value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="etiqueta">Notas</label>
            <input className="campo" value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => guardar.mutate()}
              disabled={guardar.isPending || form.nombre.trim().length < 3}
              className="boton-primario flex-1">
              {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}