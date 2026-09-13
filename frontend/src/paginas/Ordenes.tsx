import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock, LoaderCircle, PackageOpen, MessageCircle, Hand, X,
} from 'lucide-react';
import { useSesion } from '../lib/sesion';
import { useOrdenes, useCatalogos, flujoDesdeCatalogos, type FiltrosOrdenes } from '../lib/consultas';
import { fechaCorta, avisoEntrega, enlaceWhatsapp } from '../lib/formato';
import { api, mensajeDeError } from '../lib/api';
import BarraEtapas from '../componentes/BarraEtapas';

export default function Ordenes() {
  const { usuario, puede } = useSesion();
  const [params] = useSearchParams();
  const cliente = useQueryClient();

  const esDisenador = usuario?.puesto === 'Diseñador';
  const puedeContactar = puede('clientes.contactar');

  const [filtros, setFiltros] = useState<FiltrosOrdenes>({
    sinTomar: esDisenador,
  });

  const busqueda = params.get('q') ?? undefined;
  const filtrosFinales = useMemo(() => ({ ...filtros, q: busqueda }), [filtros, busqueda]);

  const { data: catalogos } = useCatalogos();
  const { data: filas = [], isLoading } = useOrdenes(filtrosFinales);

  const tomar = useMutation({
    mutationFn: (lineaId: number) => api.post(`/lineas/${lineaId}/tomar`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['ordenes'] }),
    onError: (error) => alert(mensajeDeError(error)),
  });

  function alternar(clave: keyof FiltrosOrdenes) {
    setFiltros((f) => ({ ...f, [clave]: !f[clave] }));
  }

  const hayFiltros =
    filtros.vendedor || filtros.tipo || filtros.porVencer || filtros.sinTomar || filtros.finalizadas;

  return (
    <div className="space-y-4">
      {/* ---------- Encabezado ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {esDisenador ? 'Trabajos disponibles' : 'Órdenes en proceso'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isLoading ? 'Cargando...' : `${filas.length} trabajo${filas.length === 1 ? '' : 's'}`}
            {busqueda && ` · búsqueda: "${busqueda}"`}
          </p>
        </div>

        {puede('ordenes.crear') && (
          <Link to="/ordenes/nueva" className="boton-primario">
            Nueva orden
          </Link>
        )}
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => alternar('porVencer')}
          className={`boton ${
            filtros.porVencer
              ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
              : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          <AlarmClock className="h-4 w-4" />
          Por vencer
        </button>

        {esDisenador && (
          <button
            onClick={() => alternar('sinTomar')}
            className={`boton ${
              filtros.sinTomar
                ? 'bg-marca-600 text-white shadow-sm hover:bg-marca-700'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            <Hand className="h-4 w-4" />
            Sin asignar
          </button>
        )}

        <select
          value={filtros.vendedor ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, vendedor: e.target.value ? Number(e.target.value) : undefined }))
          }
          className="campo w-auto py-2"
        >
          <option value="">Todos los vendedores</option>
          {catalogos?.vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
        </select>

        <select
          value={filtros.tipo ?? ''}
          onChange={(e) =>
            setFiltros((f) => ({ ...f, tipo: e.target.value ? Number(e.target.value) : undefined }))
          }
          className="campo w-auto py-2"
        >
          <option value="">Todos los tipos</option>
          {catalogos?.tiposTrabajo.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={!!filtros.finalizadas}
            onChange={() => alternar('finalizadas')}
            className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
          />
          Incluir finalizadas
        </label>

        {hayFiltros && (
          <button
            onClick={() => setFiltros({})}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* ---------- Tabla ---------- */}
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
        </div>
      ) : filas.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <PackageOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No hay trabajos que mostrar</p>
          <p className="mt-1 text-sm text-slate-500">
            {hayFiltros ? 'Pruebe quitando algún filtro.' : 'Todo está al día.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Trabajo</th>
                  <th className="px-4 py-3">Etapa</th>
                  {!esDisenador && <th className="px-4 py-3">Diseñador</th>}
                  <th className="px-4 py-3">Ingreso</th>
                  <th className="px-4 py-3">Entrega</th>
                  {esDisenador && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => {
                  const flujo = flujoDesdeCatalogos(
                    catalogos, f.tipo_trabajo_id, !!f.archivo_sin_cambios
                  );
                  const aviso = avisoEntrega(f.dias_restantes);
                  const puedeAvanzar = puede('etapas.avanzar') && !f.finalizada;
                  const urlWhatsapp = enlaceWhatsapp(f.telefono_wa);
                  const codigoTipo = catalogos?.tiposTrabajo.find(
                    (t) => t.id === f.tipo_trabajo_id
                  )?.codigo;
                  
                  return (
                    <tr
                      key={f.linea_id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        f.por_vencer ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <Link
                          to={`/ordenes/${f.orden_id}`}
                          className="font-semibold text-marca-700 hover:text-marca-800 hover:underline"
                        >
                          #{f.numero_orden}
                        </Link>
                        {f.estancada === 1 && (
                          <span className="ml-1.5 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            sin avance
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{f.cliente}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {f.nombre_comercial && (
                            <span className="text-xs text-slate-500">{f.nombre_comercial}</span>
                          )}
                          {puedeContactar && f.telefono_wa && (
                            <a
                              href={urlWhatsapp}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                              title="Escribir por WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {f.telefono}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-900">{f.nombre_trabajo}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {f.tipo_trabajo}
                          </span>
                          {f.archivo_sin_cambios === 1 && (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                              sin cambios
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <BarraEtapas
                          lineaId={f.linea_id}
                          flujo={flujo}
                          secuenciaActual={f.secuencia_actual}
                          puedeAvanzar={puedeAvanzar}
                          tipoCodigo={codigoTipo}
                          compacto
                        />
                        <p className="mt-1 text-xs font-medium text-slate-600">{f.etapa}</p>
                      </td>

                      {!esDisenador && (
                        <td className="px-4 py-3 align-top text-slate-600">
                          {f.disenador ?? <span className="text-slate-300">—</span>}
                        </td>
                      )}

                      <td className="px-4 py-3 align-top text-slate-500">
                        {fechaCorta(f.fecha_ingreso)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-700">{fechaCorta(f.fecha_entrega)}</p>
                        {!f.finalizada && (
                          <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${aviso.clase}`}>
                            {aviso.texto}
                          </span>
                        )}
                      </td>

                      {esDisenador && (
                        <td className="px-4 py-3 align-top">
                          {!f.disenador_id && (
                            <button
                              onClick={() => tomar.mutate(f.linea_id)}
                              disabled={tomar.isPending}
                              className="boton-primario py-1.5 px-3 text-xs"
                            >
                              Tomar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}