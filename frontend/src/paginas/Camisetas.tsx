import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shirt, Plus, Trash2, LoaderCircle, X, Send, CalendarDays } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';
import { useSesion } from '../lib/sesion';
import { fecha, fechaHora } from '../lib/formato';
import { nuevoId } from '../lib/id';

interface Pedido {
  id: number;
  estado: string;
  nota: string | null;
  fecha_requerida: string;
  creado_en: string;
  atendido_en: string | null;
  solicitante: string;
  puesto: string;
  atendido_por: string | null;
  cliente: string | null;
  total_lineas: number;
  total_prendas: number;
}

const ESTADOS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADO: 'bg-blue-100 text-blue-700',
  ENTREGADO: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-red-100 text-red-700',
};

export default function Camisetas() {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const atiende = puede('camisetas.atender');

  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['camisetas', atiende, filtroEstado],
    queryFn: async () => {
      const ruta = atiende
        ? `/camisetas${filtroEstado ? `?estado=${filtroEstado}` : ''}`
        : '/camisetas/mios';
      return (await api.get<Pedido[]>(ruta)).data;
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.post(`/camisetas/${id}/estado`, { estado }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['camisetas'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
    },
    onError: (e) => alert(mensajeDeError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {atiende ? 'Pedidos de camisetas' : 'Mis pedidos de camisetas'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{pedidos.length} pedidos</p>
        </div>
        {puede('camisetas.solicitar') && (
          <button onClick={() => setNuevo(true)} className="boton-primario">
            <Plus className="h-4 w-4" />
            Pedir camisetas
          </button>
        )}
      </div>

      {atiende && (
        <div className="flex flex-wrap gap-1">
          {['', 'PENDIENTE', 'APROBADO', 'ENTREGADO', 'RECHAZADO'].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroEstado === e
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {e === '' ? 'Todos' : e.charAt(0) + e.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Shirt className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay pedidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map((p) => (
            <div key={p.id} className="tarjeta">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[p.estado]}`}>
                      {p.estado.charAt(0) + p.estado.slice(1).toLowerCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {p.total_prendas} prenda{p.total_prendas === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-marca-700">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Para el {fecha(p.fecha_requerida)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.solicitante} ({p.puesto}) · {fechaHora(p.creado_en)}
                  </p>
                  {p.cliente && (
                    <p className="text-xs text-slate-500">Para el cliente {p.cliente}</p>
                  )}
                  {p.nota && <p className="mt-1 text-sm text-slate-600">{p.nota}</p>}
                  {p.atendido_por && (
                    <p className="mt-1 text-xs text-slate-400">
                      Atendido por {p.atendido_por} · {fechaHora(p.atendido_en)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                    className="boton-secundario py-1.5 px-3 text-xs"
                  >
                    {abierto === p.id ? 'Ocultar' : 'Ver tallas'}
                  </button>
                  {atiende && p.estado === 'PENDIENTE' && (
                    <>
                      <button
                        onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'APROBADO' })}
                        className="boton-primario py-1.5 px-3 text-xs"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'RECHAZADO' })}
                        className="boton-secundario py-1.5 px-3 text-xs"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {atiende && p.estado === 'APROBADO' && (
                    <button
                      onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'ENTREGADO' })}
                      className="boton-primario py-1.5 px-3 text-xs"
                    >
                      Marcar entregado
                    </button>
                  )}
                </div>
              </div>

              {abierto === p.id && <DetallePedido id={p.id} />}
            </div>
          ))}
        </div>
      )}

      {nuevo && (
        <ModalPedido
          onCerrar={() => setNuevo(false)}
          onGuardado={() => {
            setNuevo(false);
            cliente.invalidateQueries({ queryKey: ['camisetas'] });
      cliente.invalidateQueries({ queryKey: ['pendientes'] });
            cliente.invalidateQueries({ queryKey: ['notificaciones'] });
          }}
        />
      )}
    </div>
  );
}

/** Cuadrícula de tallas, igual a la hoja que se usa en papel. */
function DetallePedido({ id }: { id: number }) {
  const { data: catalogos } = useCatalogos();
  const { data, isLoading } = useQuery({
    queryKey: ['camisetas', id],
    queryFn: async () => (await api.get(`/camisetas/${id}`)).data,
  });

  if (isLoading || !catalogos) {
    return (
      <div className="mt-3 grid place-items-center py-4">
        <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  const mujer = catalogos.tallas.filter((t) => t.genero === 'MUJER');
  const hombre = catalogos.tallas.filter((t) => t.genero === 'HOMBRE');
  const todas = [...mujer, ...hombre];

  function total(tallaId: number) {
    return (data?.lineas ?? []).reduce(
      (s: number, l: any) => s + (l.cantidades?.[tallaId] ?? 0),
      0
    );
  }

  return (
    <div className="mt-3 overflow-x-auto border-t border-slate-100 pt-3">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold text-slate-600">
              Descripción
            </th>
            <th colSpan={mujer.length} className="border border-slate-200 bg-pink-50 px-2 py-1 text-xs font-semibold text-pink-800">
              Talla mujer
            </th>
            <th colSpan={hombre.length} className="border border-slate-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
              Hombre
            </th>
          </tr>
          <tr>
            {todas.map((t) => (
              <th
                key={t.id}
                className={`border border-slate-200 px-2 py-1 text-xs font-semibold ${
                  t.genero === 'MUJER' ? 'bg-pink-50/60 text-pink-900' : 'bg-sky-50/60 text-sky-900'
                }`}
              >
                {t.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.lineas.map((l: any) => (
            <tr key={l.id}>
              <td className="border border-slate-200 px-3 py-1.5 text-slate-800">{l.descripcion}</td>
              {todas.map((t) => (
                <td key={t.id} className="border border-slate-200 px-2 py-1.5 text-center text-slate-700">
                  {l.cantidades?.[t.id] || ''}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="border border-slate-200 px-3 py-1.5 text-slate-700">Total</td>
            {todas.map((t) => (
              <td key={t.id} className="border border-slate-200 px-2 py-1.5 text-center text-slate-900">
                {total(t.id) || 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface LineaForm {
  clave: string;
  descripcion: string;
  cantidades: Record<number, string>;
}

function lineaVacia(): LineaForm {
  return { clave: nuevoId(), descripcion: '', cantidades: {} };
}

function ModalPedido({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const { data: catalogos } = useCatalogos();
  const [fechaRequerida, setFechaRequerida] = useState('');
  const [nota, setNota] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia(), lineaVacia(), lineaVacia()]);
  const [error, setError] = useState('');

  const mujer = (catalogos?.tallas ?? []).filter((t) => t.genero === 'MUJER');
  const hombre = (catalogos?.tallas ?? []).filter((t) => t.genero === 'HOMBRE');
  const todas = [...mujer, ...hombre];

  function cambiar(clave: string, campo: 'descripcion', valor: string) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, [campo]: valor } : l)));
  }

  function cambiarCantidad(clave: string, tallaId: number, valor: string) {
    setLineas((ls) =>
      ls.map((l) =>
        l.clave === clave ? { ...l, cantidades: { ...l.cantidades, [tallaId]: valor } } : l
      )
    );
  }

  function total(tallaId: number) {
    return lineas.reduce((s, l) => s + (Number(l.cantidades[tallaId]) || 0), 0);
  }

  const totalGeneral = todas.reduce((s, t) => s + total(t.id), 0);

  const enviar = useMutation({
    mutationFn: () =>
      api.post('/camisetas', {
        fechaRequerida,
        nota: nota.trim() || null,
        lineas: lineas
          .filter((l) => l.descripcion.trim())
          .map((l) => ({
            descripcion: l.descripcion.trim(),
            cantidades: Object.fromEntries(
              Object.entries(l.cantidades)
                .map(([k, v]) => [k, Number(v) || 0])
                .filter(([, v]) => (v as number) > 0)
            ),
          })),
      }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const validas = lineas.filter(
    (l) => l.descripcion.trim() && Object.values(l.cantidades).some((c) => Number(c) > 0)
  ).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Shirt className="h-4 w-4 text-slate-400" />
            Pedido de camisetas
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">
                Fecha en que se necesita <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="campo"
                value={fechaRequerida}
                onChange={(e) => setFechaRequerida(e.target.value)}
              />
            </div>
            <div>
              <label className="etiqueta">Nota</label>
              <input
                className="campo"
                value={nota}
                placeholder="Opcional"
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold text-slate-600">
                    Descripción
                  </th>
                  <th colSpan={mujer.length} className="border border-slate-200 bg-pink-50 px-2 py-1 text-xs font-semibold text-pink-800">
                    Talla mujer
                  </th>
                  <th colSpan={hombre.length} className="border border-slate-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                    Hombre
                  </th>
                  <th rowSpan={2} className="w-8 border-0" />
                </tr>
                <tr>
                  {todas.map((t) => (
                    <th
                      key={t.id}
                      className={`border border-slate-200 px-1 py-1 text-xs font-semibold ${
                        t.genero === 'MUJER' ? 'bg-pink-50/60 text-pink-900' : 'bg-sky-50/60 text-sky-900'
                      }`}
                    >
                      {t.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.clave}>
                    <td className="border border-slate-200 p-0">
                      <input
                        className="w-full min-w-40 border-0 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-marca-600"
                        value={l.descripcion}
                        placeholder="Ej. Polo blanca algodón"
                        onChange={(e) => cambiar(l.clave, 'descripcion', e.target.value)}
                      />
                    </td>
                    {todas.map((t) => (
                      <td key={t.id} className="border border-slate-200 p-0">
                        <input
                          type="number"
                          min={0}
                          className="w-14 border-0 px-1 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-marca-600"
                          value={l.cantidades[t.id] ?? ''}
                          onChange={(e) => cambiarCantidad(l.clave, t.id, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="border-0 px-1 text-center">
                      <button
                        type="button"
                        disabled={lineas.length === 1}
                        onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                        className="grid h-7 w-7 place-items-center rounded text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="border border-slate-200 px-3 py-1.5 text-slate-700">Total</td>
                  {todas.map((t) => (
                    <td key={t.id} className="border border-slate-200 px-2 py-1.5 text-center text-slate-900">
                      {total(t.id) || 0}
                    </td>
                  ))}
                  <td className="border-0" />
                </tr>
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setLineas((ls) => [...ls, lineaVacia()])}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-marca-400 hover:text-marca-600"
          >
            <Plus className="inline h-4 w-4" /> Agregar línea
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
            <p className="flex-1 text-sm text-slate-500">
              {totalGeneral} prenda{totalGeneral === 1 ? '' : 's'} en {validas} línea
              {validas === 1 ? '' : 's'}
            </p>
            <button
              onClick={() => enviar.mutate()}
              disabled={enviar.isPending || !fechaRequerida || validas === 0}
              className="boton-primario"
            >
              {enviar.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar pedido
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}