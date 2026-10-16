import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Printer, MessageCircle, LoaderCircle, Clock, User, Hand, Pencil, Zap,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { useState } from 'react';
import { fecha, fechaHora, numero, enlaceWhatsapp } from '../lib/formato';
import BarraEtapas from '../componentes/BarraEtapas';
import SubirMuestra from '../componentes/SubirMuestra';
import EditarOrden from '../componentes/EditarOrden';

export default function DetalleOrden() {
  const { id, numero: num } = useParams();
  const navegar = useNavigate();
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const [editando, setEditando] = useState(false);
  const ruta = num ? `/ordenes/numero/${num}` : `/ordenes/${id}`;

  const { data: orden, isLoading, error } = useQuery({
    queryKey: ['orden', id ?? `n${num}`],
    queryFn: async () => (await api.get(ruta)).data,
  });

  const tomar = useMutation({
    mutationFn: (lineaId: number) => api.post(`/lineas/${lineaId}/tomar`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['orden'] }),
    onError: (e) => alert(mensajeDeError(e)),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="tarjeta text-center">
        <p className="font-medium text-slate-900">{mensajeDeError(error)}</p>
        <button onClick={() => navegar('/')} className="boton-secundario mt-4">
          Volver a órdenes
        </button>
      </div>
    );
  }

  const puedeContactar = puede('clientes.contactar');

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navegar(-1)}
            aria-label="Volver"
            className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg text-slate-500
                       transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">#{orden.numero_orden}</h1>
              <EstadoOrden estado={orden.estado} />
              {orden.urgente === 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  <Zap className="h-3 w-3" />
                  Urgente
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Registrada por {orden.registrada_por} · {fechaHora(orden.creado_en)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {puede('ordenes.editar') && (
            <button onClick={() => setEditando(true)} className="boton-secundario">
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          )}
          <Link to={`/ordenes/${orden.id}/imprimir`} className="boton-secundario">
            <Printer className="h-4 w-4" />
            Imprimir
          </Link>
        </div>
      </div>

      {/* ---------- Cliente ---------- */}
      <div className="tarjeta">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">{orden.cliente}</h2>
            {orden.nombre_comercial && (
              <p className="text-sm text-slate-500">{orden.nombre_comercial}</p>
            )}
            <dl className="mt-2 space-y-0.5 text-sm text-slate-600">
              <dd>Cédula {orden.cliente_cedula}</dd>
              <dd>
                {puedeContactar && orden.telefono_wa ? (
                  <a
                    href={enlaceWhatsapp(orden.telefono_wa)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {orden.telefono}
                  </a>
                ) : (
                  orden.telefono
                )}
              </dd>
              {orden.email_facturacion && <dd>{orden.email_facturacion}</dd>}
            </dl>

            {orden.medio_muestra && (
              <p className="mt-2 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {orden.medio_muestra === 'WHATSAPP' && 'Muestra por WhatsApp'}
                {orden.medio_muestra === 'EMAIL' &&
                  `Muestra por correo${orden.email_muestra ? `: ${orden.email_muestra}` : ''}`}
                {orden.medio_muestra === 'VENDEDOR' && `Muestra a ${orden.vendedor}`}
              </p>
            )}
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Vendedor</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{orden.vendedor}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Ingreso</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{fecha(orden.fecha_ingreso)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Entrega</dt>
              <dd className="mt-0.5 font-semibold text-marca-700">{fecha(orden.fecha_entrega)}</dd>
            </div>
          </div>
        </div>

        {orden.observaciones && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {orden.observaciones}
          </p>
        )}

        {orden.motivo_urgencia && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            <strong>Urgente:</strong> {orden.motivo_urgencia}
          </p>
        )}

      </div>

      {/* ---------- Líneas de trabajo ---------- */}
      {orden.lineas.map((linea: any, i: number) => (
        <div key={linea.id} className="tarjeta space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full
                               bg-slate-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{linea.nombre_trabajo}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {linea.tipo_trabajo}
                  </span>
                  {linea.archivo_sin_cambios === 1 && (
                    <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      Archivo sin cambios
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    Entrega {fecha(linea.fecha_entrega)}
                  </span>
                  {puede('ordenes.ver_precio') && (
                    <PrecioLinea lineaId={linea.id} precio={linea.precio} />
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-sm">
              {linea.disenador ? (
                <p className="flex items-center gap-1.5 text-slate-600">
                  <User className="h-3.5 w-3.5" />
                  {linea.disenador}
                </p>
              ) : (
                puede('ordenes.tomar') && !linea.finalizada && (
                  <button
                    onClick={() => tomar.mutate(linea.id)}
                    disabled={tomar.isPending}
                    className="boton-primario py-1.5 px-3 text-xs"
                  >
                    <Hand className="h-3.5 w-3.5" />
                    Tomar este trabajo
                  </button>
                )
              )}
            </div>
          </div>

          {/* Barra de etapas grande */}
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <BarraEtapas
              lineaId={linea.id}
              flujo={linea.flujo}
              secuenciaActual={linea.secuencia_actual}
              puedeAvanzar={puede('etapas.avanzar') && !linea.entregada}
              tipoCodigo={linea.tipo_codigo}
              costureraId={linea.detalle?.costurera_id ?? null}
              sinConfeccion={linea.detalle?.sin_confeccion === 1}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Especificaciones */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Especificaciones
              </h4>
              <dl className="space-y-1 text-sm">
                <Especificaciones linea={linea} />
              </dl>
              {linea.observaciones && (
                <p className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 ring-1 ring-amber-200">
                  {linea.observaciones}
                </p>
              )}
            </div>

            <SubirMuestra
              lineaId={linea.id}
              archivoSinCambios={linea.archivo_sin_cambios === 1}
              puedeSubir={puede('archivos.subir')}
            />
          </div>

          {/* Historial */}
          {linea.historial?.length > 0 && (
            <details className="text-sm">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold
                                  uppercase tracking-wide text-slate-500 hover:text-slate-700">
                <Clock className="h-3.5 w-3.5" />
                Historial ({linea.historial.length})
              </summary>
              <ol className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-4">
                {linea.historial.map((h: any, j: number) => (
                  <li key={j} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-marca-500" />
                    <span className="font-medium text-slate-800">{h.nombre}</span>
                    <span className="text-slate-500">
                      {' · '}{h.usuario ?? 'sistema'}
                      {h.puesto && ` (${h.puesto})`}
                    </span>
                    <span className="ml-1 text-slate-400">{fechaHora(h.marcada_en)}</span>
                    {h.minutos_en_etapa != null && h.minutos_en_etapa > 0 && (
                      <span className="ml-1 text-slate-400">
                        · {formatoDuracion(h.minutos_en_etapa)}
                      </span>
                    )}
                    {h.nota && (
                      <p className="mt-0.5 rounded bg-slate-50 px-2 py-1 text-slate-600">
                        {h.nota}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      ))}
      {editando && <EditarOrden orden={orden} onCerrar={() => setEditando(false)} />}
    </div>
  );
}

function formatoDuracion(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return `${Math.round(horas / 24)} d`;
}

function EstadoOrden({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    ABIERTA: 'bg-blue-100 text-blue-700',
    FINALIZADA: 'bg-emerald-100 text-emerald-700',
    ENTREGADA: 'bg-slate-200 text-slate-600',
    ANULADA: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilos[estado] ?? ''}`}>
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  );
}

/** Los campos mostrados dependen de la categoría del trabajo. */
function Especificaciones({ linea }: { linea: any }) {
  const d = linea.detalle;
  const filas: Array<[string, string]> = [];

  switch (linea.tipo_codigo) {
    case 'TALONARIOS':
      if (d) {
        filas.push(['Blocks', `${numero(d.cantidad_blocks)} de ${numero(d.hojas_por_block)}`]);
        filas.push(['Total de hojas', numero(d.total_hojas)]);
        filas.push(['Tamaño', d.tamano ?? d.tamano_otro ?? '—']);
        filas.push(['Copias', d.tipo_copia]);
        filas.push(['Tinta', d.tinta]);
        if (d.numeracion_inicial != null) {
          filas.push([
            'Numeración',
            `${numero(d.numeracion_inicial)} al ${numero(d.numeracion_final)}`,
          ]);
        }
        const acabados = [
          d.encolado && 'Encolado',
          d.perforado && 'Perforado',
          d.grapado && 'Grapado',
          d.carbon && 'Carbón',
        ].filter(Boolean);
        if (acabados.length) filas.push(['Acabados', acabados.join(', ')]);
        if (d.copias?.length) {
          for (const c of d.copias) {
            const rotulo =
              c.rol === 'ORIGINAL'
                ? 'Original'
                : c.rol === 'FINAL'
                  ? 'Final'
                  : `Intermedio ${c.posicion - 1}`;
            filas.push([rotulo, c.papel]);
          }
        }
      }
      break;
    case 'SOBRES':
      filas.push(['Cantidad', numero(linea.cantidad)]);
      if (d) {
        filas.push(['Tipo de sobre', d.tipo_sobre]);
        filas.push(['Tinta', d.tinta]);
      }
      break;
    case 'HP_LATEX':
    case 'IMPRESION_DIGITAL':
      filas.push(['Cantidad', numero(linea.cantidad)]);
      if (d) {
        filas.push(['Tamaño', d.tamano]);
        filas.push(['Material', d.material]);
      }
      break;
    case 'TEXTIL':
      filas.push(['Cantidad', numero(linea.cantidad)]);
      if (d) {
        filas.push(['Tela', d.tela]);
        if (d.perfil_impresion) filas.push(['Perfil de impresión', d.perfil_impresion]);
        filas.push([
          'Confección',
          d.sin_confeccion === 1
            ? 'N/A — el cliente confecciona'
            : (d.costurera ?? 'Sin asignar'),
        ]);
      }
      break;
    case 'SELLOS':
      filas.push(['Cantidad', numero(linea.cantidad)]);
      if (d?.codigo_sello) filas.push(['Código', d.codigo_sello]);
      if (d?.tinta) filas.push(['Tinta', d.tinta]);
      break;
    default:
      filas.push(['Cantidad', numero(linea.cantidad)]);
  }

  return (
    <>
      {filas.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex justify-between gap-3 border-b border-slate-50 pb-1">
          <dt className="text-slate-500">{rotulo}</dt>
          <dd className="text-right font-medium text-slate-900">{valor}</dd>
        </div>
      ))}
    </>
  );
}

/**
 * Precio anotado en la linea. Se edita en el sitio, sin abrir nada.
 * Es referencia interna: no alimenta ninguna facturacion ni sale impreso.
 */
function PrecioLinea({ lineaId, precio }: { lineaId: number; precio: string | null }) {
  const cliente = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(precio ?? '');

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/lineas/${lineaId}/precio`, {
        precio: String(valor).trim() === '' ? null : Number(valor),
      }),
    onSuccess: () => {
      setEditando(false);
      cliente.invalidateQueries({ queryKey: ['orden'] });
    },
    onError: (e) => alert(mensajeDeError(e)),
  });

  if (editando) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min={0}
          step="0.01"
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar.mutate();
            if (e.key === 'Escape') {
              setValor(precio ?? '');
              setEditando(false);
            }
          }}
          className="w-28 rounded border border-slate-300 px-2 py-0.5 text-xs"
        />
        <button
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
          className="rounded bg-marca-600 px-2 py-0.5 text-xs font-medium text-white"
        >
          Guardar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditando(true)}
      title="Anotar el precio"
      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
        precio == null
          ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      }`}
    >
      {precio == null
        ? 'Sin precio'
        : `₡${Number(precio).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`}
    </button>
  );
}
