import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileStack, Plus, LoaderCircle, X, Pencil, CircleSlash, CircleCheck, Star,
  ArrowUpDown, History, TriangleAlert, Split, CornerDownRight,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fechaHora } from '../lib/formato';

type Categoria = 'BOND' | 'BRISTOL' | 'QUIMICO' | 'ESPECIAL';
type Variante = 'INTERMEDIO' | 'FINAL';

interface Papel {
  id: number;
  nombre: string;
  categoria: Categoria;
  es_original: number;
  activo: number;
  padre_id: number | null;
  variante: Variante | null;
  padre_nombre: string | null;
  variantes: number;
  resmas_variantes: number;
  resmas: number;
  minimo: number;
  bajo_minimo: number;
  usos: number;
}

interface Grupo {
  padre: Papel;
  hijas: Papel[];
}

const CATEGORIAS: Array<{ valor: Categoria; texto: string; clase: string }> = [
  { valor: 'QUIMICO', texto: 'Químico', clase: 'bg-violet-100 text-violet-700' },
  { valor: 'BOND', texto: 'Bond', clase: 'bg-sky-100 text-sky-700' },
  { valor: 'BRISTOL', texto: 'Bristol', clase: 'bg-amber-100 text-amber-700' },
  { valor: 'ESPECIAL', texto: 'Especial', clase: 'bg-slate-100 text-slate-700' },
];

const ROTULO_VARIANTE: Record<Variante, string> = {
  INTERMEDIO: 'Intermedio',
  FINAL: 'Final',
};

function etiquetaCategoria(c: Categoria) {
  return CATEGORIAS.find((x) => x.valor === c) ?? CATEGORIAS[3];
}

/** Arma el arbol: cada color con sus variantes de bodega debajo. */
function agrupar(papeles: Papel[]): Grupo[] {
  const grupos = papeles
    .filter((p) => p.padre_id === null)
    .map((padre) => ({ padre, hijas: [] as Papel[] }));
  const porId = new Map(grupos.map((g) => [g.padre.id, g]));
  for (const p of papeles) {
    if (p.padre_id !== null) porId.get(p.padre_id)?.hijas.push(p);
  }
  return grupos;
}

export default function Papeles() {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  // Administrar el inventario y mover existencias son cosas distintas:
  // quien solo registra entradas y salidas no crea ni desactiva papeles.
  const gestiona = puede('papeles.gestionar', 'catalogos.gestionar');
  const mueve = gestiona || puede('papeles.movimientos');

  const [editando, setEditando] = useState<{ papel: Papel | null; padre?: Papel; variante?: Variante } | null>(null);
  const [moviendo, setMoviendo] = useState<Papel | null>(null);
  const [historial, setHistorial] = useState<Papel | null>(null);
  const [filtro, setFiltro] = useState<Categoria | ''>('');

  const { data: papeles = [], isLoading } = useQuery({
    queryKey: ['papeles'],
    queryFn: async () => (await api.get<Papel[]>('/admin/papeles')).data,
  });

  function refrescar() {
    cliente.invalidateQueries({ queryKey: ['papeles'] });
    cliente.invalidateQueries({ queryKey: ['catalogos'] });
  }

  const cambiarEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/admin/papeles/${id}`, { activo }),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const separar = useMutation({
    mutationFn: (id: number) => api.post(`/admin/papeles/${id}/separar`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const grupos = agrupar(papeles);
  const visibles = filtro ? grupos.filter((g) => g.padre.categoria === filtro) : grupos;

  // Solo las hojas llevan resmas: sumar tambien el color las contaria dos veces.
  const hojas = papeles.filter((p) => p.variantes === 0);
  const bajos = hojas.filter((p) => p.activo && p.bajo_minimo).length;
  const totalResmas = hojas.reduce((s, p) => s + p.resmas, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Papeles</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {totalResmas} resmas en total
            {bajos > 0 && ` · ${bajos} bajo mínimo`}
          </p>
        </div>
        {gestiona && (
          <button onClick={() => setEditando({ papel: null })} className="boton-primario">
            <Plus className="h-4 w-4" />
            Agregar papel
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filtro === ''
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          Todos
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.valor}
            onClick={() => setFiltro(filtro === c.valor ? '' : c.valor)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filtro === c.valor
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {c.texto}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <FileStack className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay papeles en esta categoría</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Resmas</th>
                  <th className="px-4 py-3 text-right">Usos</th>
                  {mueve && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map(({ padre, hijas }) => {
                  const cat = etiquetaCategoria(padre.categoria);
                  const partido = hijas.length > 0;
                  const faltante: Variante | null =
                    hijas.length === 1
                      ? hijas[0].variante === 'INTERMEDIO'
                        ? 'FINAL'
                        : 'INTERMEDIO'
                      : null;

                  return (
                    <Fragment key={padre.id}>
                      <tr
                        className={`hover:bg-slate-50/70 ${!padre.activo ? 'opacity-50' : ''} ${
                          padre.activo && !partido && padre.bajo_minimo ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{padre.nombre}</span>
                          {padre.es_original === 1 && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <Star className="h-2.5 w-2.5" />
                              original
                            </span>
                          )}
                          {!padre.activo && (
                            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${cat.clase}`}>
                            {cat.texto}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {partido ? (
                            <>
                              <span className="font-semibold text-slate-900">
                                {padre.resmas_variantes}
                              </span>
                              <span className="ml-1 text-xs text-slate-400">en total</span>
                            </>
                          ) : (
                            <>
                              <span className={`font-semibold ${padre.bajo_minimo ? 'text-red-600' : 'text-slate-900'}`}>
                                {padre.resmas}
                              </span>
                              {padre.bajo_minimo === 1 && (
                                <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                              )}
                              {padre.minimo > 0 && (
                                <span className="ml-1 text-xs text-slate-400">/ mín. {padre.minimo}</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{padre.usos}</td>
                        {mueve && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {!partido && (
                                <>
                                  <IconoAccion titulo="Actualizar existencia" onClick={() => setMoviendo(padre)}>
                                    <ArrowUpDown className="h-4 w-4" />
                                  </IconoAccion>
                                  <IconoAccion titulo="Ver movimientos" onClick={() => setHistorial(padre)}>
                                    <History className="h-4 w-4" />
                                  </IconoAccion>
                                </>
                              )}
                              {gestiona && (
                                <>
                                  {padre.categoria === 'QUIMICO' &&
                                    padre.es_original !== 1 &&
                                    !partido && (
                                      <IconoAccion
                                        titulo="Separar la existencia en intermedio y final"
                                        onClick={() => {
                                          if (
                                            confirm(
                                              `Se crearán dos renglones de bodega, "${padre.nombre} Intermedio" y "${padre.nombre} Final". ` +
                                                `Las ${padre.resmas} resmas anotadas pasan al final. ` +
                                                `Al crear la orden se seguirá viendo solo "${padre.nombre}".`
                                            )
                                          )
                                            separar.mutate(padre.id);
                                        }}
                                      >
                                        <Split className="h-4 w-4" />
                                      </IconoAccion>
                                    )}
                                  {faltante && (
                                    <IconoAccion
                                      titulo={`Agregar la variante ${ROTULO_VARIANTE[faltante].toLowerCase()}`}
                                      onClick={() => setEditando({ papel: null, padre, variante: faltante })}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </IconoAccion>
                                  )}
                                  <IconoAccion titulo="Editar" onClick={() => setEditando({ papel: padre })}>
                                    <Pencil className="h-4 w-4" />
                                  </IconoAccion>
                                  <IconoAccion
                                    titulo={padre.activo ? 'Desactivar' : 'Activar'}
                                    onClick={() => cambiarEstado.mutate({ id: padre.id, activo: !padre.activo })}
                                  >
                                    {padre.activo ? <CircleSlash className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                                  </IconoAccion>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {hijas.map((h) => (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-50 ${!h.activo ? 'opacity-50' : ''} ${
                            h.activo && h.bajo_minimo ? 'bg-red-50/50' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="py-2 pl-10 pr-4">
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <CornerDownRight className="h-3.5 w-3.5 text-slate-400" />
                              {h.variante ? ROTULO_VARIANTE[h.variante] : h.nombre}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">solo bodega</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`font-semibold ${h.bajo_minimo ? 'text-red-600' : 'text-slate-900'}`}>
                              {h.resmas}
                            </span>
                            {h.bajo_minimo === 1 && (
                              <TriangleAlert className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                            )}
                            {h.minimo > 0 && (
                              <span className="ml-1 text-xs text-slate-400">/ mín. {h.minimo}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">—</td>
                          {mueve && (
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <IconoAccion titulo="Actualizar existencia" onClick={() => setMoviendo(h)}>
                                  <ArrowUpDown className="h-4 w-4" />
                                </IconoAccion>
                                <IconoAccion titulo="Ver movimientos" onClick={() => setHistorial(h)}>
                                  <History className="h-4 w-4" />
                                </IconoAccion>
                                {gestiona && (
                                  <IconoAccion titulo="Editar" onClick={() => setEditando({ papel: h })}>
                                    <Pencil className="h-4 w-4" />
                                  </IconoAccion>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-1 text-xs text-slate-500">
        <p>
          El papel marcado como <strong>original</strong> es el que se asigna automáticamente a la
          primera hoja de los talonarios con copias. Solo puede haber uno.
        </p>
        <p>
          Los químicos separados llevan la existencia por <strong>intermedio</strong> y{' '}
          <strong>final</strong>. Al crear la orden se escoge solo el color, sin distinguir cuál
          de los dos se usará.
        </p>
      </div>

      {editando && (
        <ModalPapel
          papel={editando.papel}
          padre={editando.padre}
          variante={editando.variante}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); refrescar(); }}
        />
      )}
      {moviendo && (
        <ModalMovimiento
          papel={moviendo}
          onCerrar={() => setMoviendo(null)}
          onGuardado={() => { setMoviendo(null); refrescar(); }}
        />
      )}
      {historial && <ModalHistorial papel={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}

function IconoAccion({
  titulo, onClick, children,
}: {
  titulo: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function Caja({
  titulo, onCerrar, children,
}: {
  titulo: string; onCerrar: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
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

function ModalPapel({
  papel, padre, variante, onCerrar, onGuardado,
}: {
  papel: Papel | null;
  padre?: Papel;
  variante?: Variante;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  // Una variante no escoge categoria ni puede ser el original: hereda el color.
  const esVariante = papel ? papel.padre_id !== null : !!padre;
  const partido = (papel?.variantes ?? 0) > 0;

  const [form, setForm] = useState({
    nombre:
      papel?.nombre ??
      (padre && variante ? `${padre.nombre} ${ROTULO_VARIANTE[variante]}` : ''),
    categoria: (papel?.categoria ?? 'QUIMICO') as Categoria,
    esOriginal: papel?.es_original === 1,
    minimo: String(papel?.minimo ?? padre?.minimo ?? 0),
  });
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: async () => {
      const base = {
        nombre: form.nombre.trim(),
        minimo: Number(form.minimo) || 0,
      };
      if (papel) {
        return api.patch(`/admin/papeles/${papel.id}`, {
          ...base,
          ...(esVariante ? {} : { categoria: form.categoria, esOriginal: form.esOriginal }),
        });
      }
      if (padre && variante) {
        return api.post('/admin/papeles', {
          ...base,
          categoria: 'QUIMICO',
          padreId: padre.id,
          variante,
        });
      }
      return api.post('/admin/papeles', {
        ...base,
        categoria: form.categoria,
        esOriginal: form.esOriginal,
      });
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const titulo = papel
    ? esVariante ? 'Editar variante' : 'Editar papel'
    : padre ? `Variante de ${padre.nombre}` : 'Nuevo papel';

  return (
    <Caja titulo={titulo} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
          <input className="campo" value={form.nombre} autoFocus
            placeholder="Ej. Químico Rosado"
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>

        {!esVariante && (
          <div>
            <label className="etiqueta">Categoría <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <button key={c.valor} type="button"
                  onClick={() => setForm({ ...form, categoria: c.valor })}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                    form.categoria === c.valor
                      ? 'bg-marca-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                  }`}>
                  {c.texto}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Los de categoría Químico son los que se ofrecen para las copias de los talonarios.
            </p>
          </div>
        )}

        {!partido && (
          <div>
            <label className="etiqueta">Mínimo de alerta (resmas)</label>
            <input type="number" min={0} className="campo" value={form.minimo}
              onChange={(e) => setForm({ ...form, minimo: e.target.value })} />
            <p className="mt-1 text-xs text-slate-500">
              Cuando la existencia baje de aquí, la fila sale resaltada en rojo. En cero no avisa.
            </p>
          </div>
        )}

        {partido && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Este color lleva la existencia separada. Las resmas y el mínimo se manejan en el
            intermedio y en el final, no aquí.
          </p>
        )}

        {!esVariante && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2
                            text-sm text-emerald-900 ring-1 ring-emerald-200">
            <input type="checkbox" checked={form.esOriginal}
              onChange={(e) => setForm({ ...form, esOriginal: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600" />
            <span>
              <span className="font-medium">Es el papel del original</span>
              <span className="block text-xs text-emerald-700">
                Se asigna solo a la primera hoja de los talonarios con copias. Marcarlo quita la
                marca del papel que la tenga.
              </span>
            </span>
          </label>
        )}

        {!papel && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            El papel se crea con cero resmas. Registre la entrada después, desde el ícono de
            actualizar existencia.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => guardar.mutate()}
            disabled={guardar.isPending || form.nombre.trim().length < 2}
            className="boton-primario flex-1">
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Caja>
  );
}

function nombreCompleto(papel: Papel) {
  if (papel.padre_id && papel.variante) {
    return `${papel.padre_nombre ?? papel.nombre} · ${ROTULO_VARIANTE[papel.variante]}`;
  }
  return papel.nombre;
}

function ModalMovimiento({
  papel, onCerrar, onGuardado,
}: {
  papel: Papel; onCerrar: () => void; onGuardado: () => void;
}) {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const mover = useMutation({
    mutationFn: () =>
      api.post(`/admin/papeles/${papel.id}/movimiento`, {
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo.trim() || undefined,
      }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const resultado =
    tipo === 'ENTRADA' ? papel.resmas + Number(cantidad)
    : tipo === 'SALIDA' ? papel.resmas - Number(cantidad)
    : Number(cantidad);

  const sugerencias: Record<typeof tipo, string> = {
    ENTRADA: 'Ej. Compra a proveedor',
    SALIDA: 'Ej. Consumo en producción',
    AJUSTE: 'Ej. Conteo físico de bodega',
  };

  return (
    <Caja titulo={`Existencia de ${nombreCompleto(papel)}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Existencia actual: <strong className="text-slate-900">{papel.resmas} resmas</strong>
        </p>

        <div className="flex gap-2">
          {(['ENTRADA', 'SALIDA', 'AJUSTE'] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                tipo === t
                  ? 'bg-marca-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div>
          <label className="etiqueta">
            {tipo === 'AJUSTE' ? 'Existencia real contada' : 'Cantidad de resmas'}
          </label>
          <input type="number" min={0} className="campo" value={cantidad} autoFocus
            onChange={(e) => setCantidad(Number(e.target.value))} />
          <p className="mt-1 text-xs text-slate-500">
            Quedará en{' '}
            <strong className={resultado < 0 ? 'text-red-600' : 'text-slate-900'}>
              {resultado} resmas
            </strong>
          </p>
        </div>

        <div>
          <label className="etiqueta">Motivo</label>
          <input className="campo" value={motivo} placeholder={sugerencias[tipo]}
            onChange={(e) => setMotivo(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => mover.mutate()} disabled={mover.isPending || resultado < 0}
            className="boton-primario flex-1">
            {mover.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Registrar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Caja>
  );
}

function ModalHistorial({ papel, onCerrar }: { papel: Papel; onCerrar: () => void }) {
  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['papeles', papel.id, 'movimientos'],
    queryFn: async () => (await api.get<any[]>(`/admin/papeles/${papel.id}/movimientos`)).data,
  });

  return (
    <Caja titulo={`Movimientos de ${nombreCompleto(papel)}`} onCerrar={onCerrar}>
      {isLoading ? (
        <div className="grid place-items-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : movimientos.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Sin movimientos registrados</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {movimientos.map((m, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <div>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700'
                  : m.tipo === 'SALIDA' ? 'bg-red-100 text-red-700'
                  : 'bg-slate-200 text-slate-700'
                }`}>{m.tipo}</span>
                <p className="mt-1 text-xs text-slate-500">{m.usuario} · {fechaHora(m.creado_en)}</p>
                {m.motivo && <p className="text-xs text-slate-500">{m.motivo}</p>}
              </div>
              <p className="shrink-0 text-right text-xs text-slate-600">
                {m.saldo_anterior} → <strong className="text-slate-900">{m.saldo_nuevo}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Caja>
  );
}
