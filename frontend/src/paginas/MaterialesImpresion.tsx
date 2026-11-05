import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Shirt, Plus, Pencil, Trash2, X, LoaderCircle, Check, FileStack } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';

type Categoria = 'LATEX' | 'DIGITAL';
/** Los papeles son los de talonarios: viven en su propia tabla. */
type Pestana = Categoria | 'TELA' | 'PAPEL';
type CategoriaPapel = 'QUIMICO' | 'BOND' | 'BRISTOL' | 'ESPECIAL';

interface Material {
  id: number;
  nombre: string;
  categoria: Categoria;
  activo: number;
  usos: number;
}

interface Tela {
  id: number;
  nombre: string;
  activo: number;
  usos: number;
}

interface Papel {
  id: number;
  nombre: string;
  categoria: CategoriaPapel;
  activo: number;
  usos: number;
  padre_id: number | null;
  es_original: number;
}

type Fila = {
  id: number;
  nombre: string;
  activo: number;
  usos: number;
  categoria?: CategoriaPapel;
  es_original?: number;
};

const CATEGORIAS_PAPEL: Array<[CategoriaPapel, string, string]> = [
  ['QUIMICO', 'Químico', 'bg-violet-100 text-violet-700'],
  ['BOND', 'Bond', 'bg-sky-100 text-sky-700'],
  ['BRISTOL', 'Bristol', 'bg-amber-100 text-amber-700'],
  ['ESPECIAL', 'Especial', 'bg-slate-100 text-slate-700'],
];

const ROTULO: Record<Pestana, string> = {
  DIGITAL: 'Impresión Digital',
  LATEX: 'HP Latex',
  TELA: 'Telas',
  PAPEL: 'Papeles de talonarios',
};

export default function MaterialesImpresion() {
  const cliente = useQueryClient();
  const { puede } = useSesion();
  // Los papeles son del inventario de bodega: no cualquiera que vea este
  // catálogo puede agregarlos.
  const administraPapeles = puede('papeles.gestionar', 'catalogos.gestionar');
  const [pestana, setPestana] = useState<Pestana>('DIGITAL');
  const [editando, setEditando] = useState<Fila | 'nuevo' | null>(null);

  // Cada pestaña tiene su tabla, así que también su consulta.
  const esTela = pestana === 'TELA';
  const esPapel = pestana === 'PAPEL';
  const ruta = esTela ? '/telas' : esPapel ? '/admin/papeles' : '/materiales-impresion';
  // Sin permiso, la pestaña de papeles se ve pero no se toca.
  const puedeEditar = !esPapel || administraPapeles;

  const { data: materiales = [], isLoading: cargandoMateriales } = useQuery({
    queryKey: ['materiales-impresion'],
    queryFn: async () => (await api.get<Material[]>('/materiales-impresion')).data,
  });

  const { data: telas = [], isLoading: cargandoTelas } = useQuery({
    queryKey: ['telas'],
    queryFn: async () => (await api.get<Tela[]>('/telas')).data,
  });

  const { data: papeles = [], isLoading: cargandoPapeles } = useQuery({
    queryKey: ['papeles'],
    queryFn: async () => (await api.get<Papel[]>('/admin/papeles')).data,
  });

  const refrescar = () => {
    cliente.invalidateQueries({ queryKey: ['materiales-impresion'] });
    cliente.invalidateQueries({ queryKey: ['telas'] });
    cliente.invalidateQueries({ queryKey: ['papeles'] });
    cliente.invalidateQueries({ queryKey: ['catalogos'] });
  };

  const alternar = useMutation({
    mutationFn: (f: Fila) => api.patch(`${ruta}/${f.id}`, { activo: !f.activo }),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.delete(`${ruta}/${id}`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const isLoading = esTela ? cargandoTelas : esPapel ? cargandoPapeles : cargandoMateriales;
  const filas: Fila[] = esTela
    ? telas
    : esPapel
      // Las variantes intermedio/final son cosa de bodega; aquí van los
      // papeles como se escogen en la orden.
      ? papeles.filter((p) => p.padre_id === null)
      : materiales.filter((m) => m.categoria === pestana);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Materiales de impresión</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Lo que aparece al escoger el material o la tela en una orden
          </p>
        </div>
        {puedeEditar && (
          <button onClick={() => setEditando('nuevo')} className="boton-primario">
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {(['DIGITAL', 'LATEX', 'TELA', 'PAPEL'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              pestana === p
                ? 'border-marca-600 text-marca-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p === 'TELA' ? (
              <Shirt className="h-4 w-4" />
            ) : p === 'PAPEL' ? (
              <FileStack className="h-4 w-4" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            {ROTULO[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : filas.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          {esTela ? (
            <Shirt className="mb-3 h-10 w-10 text-slate-300" />
          ) : esPapel ? (
            <FileStack className="mb-3 h-10 w-10 text-slate-300" />
          ) : (
            <Layers className="mb-3 h-10 w-10 text-slate-300" />
          )}
          <p className="font-medium text-slate-700">
            {esTela
              ? 'Todavía no hay telas registradas'
              : esPapel
                ? 'Todavía no hay papeles registrados'
                : `Todavía no hay materiales de ${ROTULO[pestana]}`}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Agregue {esTela ? 'las que usa' : 'los que usa'} la imprenta para que{' '}
            {esTela ? 'aparezcan' : 'aparezcan'} al crear una orden.
          </p>
        </div>
      ) : (
        // overflow-x-auto: en el teléfono la tabla se desliza dentro de la
        // tarjeta en vez de empujar la página entera
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">
                  {esTela ? 'Tela' : esPapel ? 'Papel' : 'Material'}
                </th>
                {esPapel && <th className="px-4 py-3">Categoría</th>}
                <th className="px-4 py-3 text-right">Usos en órdenes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.id} className={`hover:bg-slate-50/70 ${f.activo ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {f.nombre}
                    {f.es_original === 1 && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px]
                                       font-semibold text-emerald-700">
                        Original
                      </span>
                    )}
                  </td>
                  {esPapel && (
                    <td className="px-4 py-2.5">
                      {(() => {
                        const c = CATEGORIAS_PAPEL.find((x) => x[0] === f.categoria);
                        return (
                          <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            c ? c[2] : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c ? c[1] : f.categoria}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-slate-600">{f.usos}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        f.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {f.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {!puedeEditar && <span className="text-xs text-slate-400">—</span>}
                      {puedeEditar && (
                      <button
                        onClick={() => alternar.mutate(f)}
                        title={f.activo ? 'Desactivar' : 'Activar'}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        {f.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      )}
                      {puedeEditar && (
                      <button
                        onClick={() => setEditando(f)}
                        title="Editar"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      )}
                      {/* Un papel no se borra: lleva existencias y movimientos. */}
                      {puedeEditar && !esPapel && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar ${esTela ? 'la tela' : 'el material'} "${f.nombre}"?`))
                            eliminar.mutate(f.id);
                        }}
                        title="Eliminar"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esPapel ? (
        <p className="text-xs text-slate-500">
          Estos son los papeles que se escogen en los talonarios. Desactivar uno lo saca del
          formulario de órdenes pero conserva las que ya lo usaron; por eso no se borran.
          Las existencias, los mínimos y los movimientos de bodega se llevan en la pantalla
          de <strong>Papeles</strong>.
          {!puedeEditar && ' Para agregarlos o cambiarlos hace falta el permiso de papeles.'}
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Desactivar {esTela ? 'una tela la' : 'un material lo'} saca del formulario de órdenes pero
          conserva las órdenes anteriores que {esTela ? 'la' : 'lo'} usaron. Eliminar solo se puede
          si nunca se usó.
        </p>
      )}

      {editando && (
        <ModalMaterial
          fila={editando === 'nuevo' ? null : editando}
          pestana={pestana}
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
  fila, pestana, onCerrar, onGuardado,
}: {
  fila: Fila | null;
  pestana: Pestana;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(fila?.nombre ?? '');
  const [destino, setDestino] = useState<Pestana>(pestana);
  const [categoriaPapel, setCategoriaPapel] =
    useState<CategoriaPapel>(fila?.categoria ?? 'ESPECIAL');
  const [error, setError] = useState('');

  // La tela no se puede convertir en material ni al revés: son tablas
  // distintas. Al editar, el destino queda fijo en lo que ya es.
  const puedeEscogerDestino = !fila;
  const esTela = destino === 'TELA';
  const esPapel = destino === 'PAPEL';

  const guardar = useMutation({
    // Devuelve void a proposito: las cuatro llamadas tienen tipos de
    // respuesta distintos y a react-query no le sirve ninguno.
    mutationFn: async (): Promise<void> => {
      const texto = nombre.trim();
      if (esTela) {
        if (fila) await api.patch(`/telas/${fila.id}`, { nombre: texto });
        else await api.post('/telas', { nombre: texto });
        return;
      }
      if (esPapel) {
        const papel = { nombre: texto, categoria: categoriaPapel };
        if (fila) await api.patch(`/admin/papeles/${fila.id}`, papel);
        else await api.post('/admin/papeles', papel);
        return;
      }
      const cuerpo = { nombre: texto, categoria: destino as Categoria };
      if (fila) await api.patch(`/materiales-impresion/${fila.id}`, cuerpo);
      else await api.post('/materiales-impresion', cuerpo);
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const titulo = fila
    ? esTela ? 'Editar tela' : esPapel ? 'Editar papel' : 'Editar material'
    : esTela ? 'Nueva tela' : esPapel ? 'Nuevo papel' : 'Nuevo material';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {puedeEscogerDestino && (
            <div>
              <label className="etiqueta">Dónde va</label>
              <div className="flex gap-2">
                {(['DIGITAL', 'LATEX', 'TELA', 'PAPEL'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDestino(p)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                      destino === p
                        ? 'bg-marca-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {ROTULO[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {esPapel && (
            <div>
              <label className="etiqueta">Categoría <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS_PAPEL.map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setCategoriaPapel(valor)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                      categoriaPapel === valor
                        ? 'bg-marca-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Los químicos son los de copia; lo demás va en Bond, Bristol o Especial.
              </p>
            </div>
          )}

          <div>
            <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={nombre}
              autoFocus
              placeholder={esTela ? 'Ej. Dry Fit' : esPapel ? 'Ej. Manila' : 'Ej. Papel fotográfico'}
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
