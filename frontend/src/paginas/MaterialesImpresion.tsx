import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Pencil, Trash2, X, LoaderCircle, Check } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';

type Categoria = 'LATEX' | 'DIGITAL';

interface Material {
  id: number;
  nombre: string;
  categoria: Categoria;
  activo: number;
  usos: number;
}

const ROTULO: Record<Categoria, string> = {
  LATEX: 'HP Latex',
  DIGITAL: 'Impresión Digital',
};

export default function MaterialesImpresion() {
  const cliente = useQueryClient();
  const [categoria, setCategoria] = useState<Categoria>('DIGITAL');
  const [editando, setEditando] = useState<Material | 'nuevo' | null>(null);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['materiales-impresion'],
    queryFn: async () => (await api.get<Material[]>('/materiales-impresion')).data,
  });

  const refrescar = () => {
    cliente.invalidateQueries({ queryKey: ['materiales-impresion'] });
    cliente.invalidateQueries({ queryKey: ['catalogos'] });
  };

  const alternar = useMutation({
    mutationFn: (m: Material) =>
      api.patch(`/materiales-impresion/${m.id}`, { activo: !m.activo }),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`/materiales-impresion/${id}`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const filas = todos.filter((m) => m.categoria === categoria);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Materiales de impresión</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Lo que aparece al escoger el material en una orden de HP Latex o Impresión Digital
          </p>
        </div>
        <button onClick={() => setEditando('nuevo')} className="boton-primario">
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(['DIGITAL', 'LATEX'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              categoria === c
                ? 'border-marca-600 text-marca-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            {ROTULO[c]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : filas.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Layers className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">
            Todavía no hay materiales de {ROTULO[categoria]}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Agregue los que usa la imprenta para que aparezcan al crear una orden.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Usos en órdenes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((m) => (
                <tr key={m.id} className={`hover:bg-slate-50/70 ${m.activo ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{m.nombre}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{m.usos}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        m.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => alternar.mutate(m)}
                        title={m.activo ? 'Desactivar' : 'Activar'}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        {m.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditando(m)}
                        title="Editar"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el material "${m.nombre}"?`)) eliminar.mutate(m.id);
                        }}
                        title="Eliminar"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Desactivar un material lo saca del formulario de órdenes pero conserva las órdenes
        anteriores que lo usaron. Eliminar solo se puede si nunca se usó.
      </p>

      {editando && (
        <ModalMaterial
          material={editando === 'nuevo' ? null : editando}
          categoriaPorDefecto={categoria}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            refrescar();
          }}
        />
      )}
    </div>
  );
}

function ModalMaterial({
  material, categoriaPorDefecto, onCerrar, onGuardado,
}: {
  material: Material | null;
  categoriaPorDefecto: Categoria;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(material?.nombre ?? '');
  const [categoria, setCategoria] = useState<Categoria>(
    material?.categoria ?? categoriaPorDefecto
  );
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { nombre: nombre.trim(), categoria };
      if (material) return api.patch(`/materiales-impresion/${material.id}`, cuerpo);
      return api.post('/materiales-impresion', cuerpo);
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {material ? 'Editar material' : 'Nuevo material'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="etiqueta">Categoría</label>
            <div className="flex gap-2">
              {(['DIGITAL', 'LATEX'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                    categoria === c
                      ? 'bg-marca-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {ROTULO[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={nombre}
              autoFocus
              placeholder="Ej. Papel fotográfico"
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nombre.trim().length >= 2) guardar.mutate();
              }}
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
              disabled={guardar.isPending || nombre.trim().length < 2}
              className="boton-primario flex-1"
            >
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
