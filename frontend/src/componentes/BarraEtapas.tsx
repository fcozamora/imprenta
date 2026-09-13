import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, X, Scissors } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { iconoEtapa } from '../lib/iconos';
import type { EtapaFlujo } from '../lib/tipos';

interface Props {
  lineaId: number;
  flujo: EtapaFlujo[];
  secuenciaActual: number;
  puedeAvanzar: boolean;
  compacto?: boolean;
  /** Código del tipo de trabajo; con TEXTIL se pide costurera al confeccionar. */
  tipoCodigo?: string;
  /** Costurera ya asignada, si la hay. */
  costureraId?: number | null;
}

export default function BarraEtapas({
  lineaId, flujo, secuenciaActual, puedeAvanzar, compacto = false,
  tipoCodigo, costureraId,
}: Props) {
  const cliente = useQueryClient();
  const [pidiendoCosturera, setPidiendoCosturera] = useState(false);

  const avanzar = useMutation({
    mutationFn: (costurera?: number) =>
      api.post(`/lineas/${lineaId}/avanzar`, costurera ? { costureraId: costurera } : {}),
    onSuccess: () => {
      setPidiendoCosturera(false);
      cliente.invalidateQueries({ queryKey: ['ordenes'] });
      cliente.invalidateQueries({ queryKey: ['orden'] });
      cliente.invalidateQueries({ queryKey: ['notificaciones'] });
    },
    onError: (error: any) => {
      if (error?.response?.data?.codigo === 'COSTURERA_REQUERIDA') {
        setPidiendoCosturera(true);
        return;
      }
      alert(mensajeDeError(error));
    },
  });

  // La siguiente etapa es la única en la que se puede hacer clic.
  const siguiente = flujo.find((e) => e.secuencia > secuenciaActual);

  function alAvanzar() {
    // Textil entrando a Confección sin costurera: se pide antes de mandar.
    if (tipoCodigo === 'TEXTIL' && siguiente?.codigo === 'CONFECCION' && !costureraId) {
      setPidiendoCosturera(true);
      return;
    }
    avanzar.mutate(undefined);
  }

  return (
    <>
      <div className={`flex items-center ${compacto ? 'gap-0.5' : 'gap-1'} overflow-x-auto pb-1`}>
        {flujo.map((etapa, indice) => {
          const Icono = iconoEtapa(etapa.icono);
          const completada = etapa.secuencia <= secuenciaActual;
          const esActual = etapa.secuencia === secuenciaActual;
          const esSiguiente = siguiente?.secuencia === etapa.secuencia;
          const habilitada = puedeAvanzar && esSiguiente && !avanzar.isPending;

          return (
            <div key={etapa.id} className="flex items-center">
              {indice > 0 && (
                <div
                  className={`h-0.5 shrink-0 transition-colors duration-300 ${
                    compacto ? 'w-2' : 'w-4'
                  } ${completada ? 'bg-marca-500' : 'bg-slate-200'}`}
                />
              )}

              <button
                type="button"
                disabled={!habilitada}
                onClick={alAvanzar}
                title={esSiguiente && puedeAvanzar ? `Marcar: ${etapa.nombre}` : etapa.nombre}
                className={`group flex shrink-0 flex-col items-center gap-1 rounded-lg
                            px-1.5 py-1 transition-all duration-150
                            ${habilitada ? 'cursor-pointer hover:bg-marca-50 active:scale-95' : 'cursor-default'}`}
              >
                <span
                  className={`grid place-items-center rounded-full transition-all duration-200
                              ${compacto ? 'h-7 w-7' : 'h-9 w-9'}
                              ${
                                esActual
                                  ? 'bg-marca-600 text-white shadow-md shadow-marca-600/30 ring-4 ring-marca-100'
                                  : completada
                                    ? 'bg-marca-500 text-white'
                                    : esSiguiente && puedeAvanzar
                                      ? 'bg-white text-slate-400 ring-2 ring-dashed ring-marca-300 group-hover:ring-marca-500 group-hover:text-marca-600'
                                      : 'bg-slate-100 text-slate-300'
                              }`}
                >
                  {avanzar.isPending && esSiguiente ? (
                    <LoaderCircle className={compacto ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} />
                  ) : (
                    <Icono className={compacto ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} />
                  )}
                </span>

                {!compacto && (
                  <span
                    className={`whitespace-nowrap text-[10px] font-medium leading-none ${
                      esActual ? 'text-marca-700' : completada ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {etapa.nombre}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {pidiendoCosturera && (
        <ModalCosturera
          enviando={avanzar.isPending}
          onCerrar={() => setPidiendoCosturera(false)}
          onConfirmar={(id) => avanzar.mutate(id)}
        />
      )}
    </>
  );
}

function ModalCosturera({
  enviando, onCerrar, onConfirmar,
}: {
  enviando: boolean;
  onCerrar: () => void;
  onConfirmar: (costureraId: number) => void;
}) {
  const [seleccionada, setSeleccionada] = useState<number | ''>('');

  const { data: costureras = [], isLoading } = useQuery({
    queryKey: ['costureras'],
    queryFn: async () => (await api.get<any[]>('/costureras')).data,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Scissors className="h-4 w-4 text-slate-400" />
            Enviar a confección
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-500">
          Indique a qué costurera se le entrega el trabajo.
        </p>

        {isLoading ? (
          <div className="grid place-items-center py-6">
            <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : costureras.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            No hay costureras registradas. Pida a recepción o al administrador que agregue una.
          </p>
        ) : (
          <div className="space-y-1.5">
            {costureras.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSeleccionada(c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5
                            text-left text-sm transition-all ${
                              seleccionada === c.id
                                ? 'bg-marca-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                            }`}
              >
                <span className="font-medium">{c.nombre}</span>
                {c.telefono && (
                  <span className={seleccionada === c.id ? 'text-marca-100 text-xs' : 'text-xs text-slate-400'}>
                    {c.telefono}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => seleccionada && onConfirmar(Number(seleccionada))}
            disabled={!seleccionada || enviando}
            className="boton-primario flex-1"
          >
            {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Confirmar y avanzar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </div>
  );
}