import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LoaderCircle, X, Scissors, PackageCheck, CircleSlash, MessageCircle, CircleCheck, Printer,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { iconoEtapa } from '../lib/iconos';
import type { EtapaFlujo } from '../lib/tipos';

interface AvisoWhatsapp {
  id: number;
  telefono: string;
  mensaje: string;
  numero_orden: number;
  cliente: string;
  enlace: string;
}

interface Props {
  lineaId: number;
  flujo: EtapaFlujo[];
  secuenciaActual: number;
  puedeAvanzar: boolean;
  compacto?: boolean;
  /** Código del tipo de trabajo; con TEXTIL se pide costurera al sublimar. */
  tipoCodigo?: string;
  costureraId?: number | null;
  sinConfeccion?: boolean;
}

export default function BarraEtapas({
  lineaId, flujo, secuenciaActual, puedeAvanzar, compacto = false,
  tipoCodigo, costureraId, sinConfeccion,
}: Props) {
  const cliente = useQueryClient();
  const [pidiendo, setPidiendo] = useState<'costurera' | 'nota' | 'perfil' | null>(null);
  const [avisoWa, setAvisoWa] = useState<AvisoWhatsapp | null>(null);

  const avanzar = useMutation({
    mutationFn: (cuerpo: Record<string, unknown>) =>
      api.post(`/lineas/${lineaId}/avanzar`, cuerpo),
    onSuccess: ({ data }) => {
      setPidiendo(null);
      cliente.invalidateQueries({ queryKey: ['ordenes'] });
      cliente.invalidateQueries({ queryKey: ['orden'] });
      cliente.invalidateQueries({ queryKey: ['confeccion'] });
      cliente.invalidateQueries({ queryKey: ['notificaciones'] });
      cliente.invalidateQueries({ queryKey: ['whatsapp'] });
      // La orden quedó lista: hay que avisarle al cliente.
      if (data?.whatsapp) setAvisoWa(data.whatsapp);
    },
    onError: (error: any) => {
      const codigo = error?.response?.data?.codigo;
      if (codigo === 'COSTURERA_REQUERIDA') return setPidiendo('costurera');
      if (codigo === 'NOTA_REQUERIDA') return setPidiendo('nota');
      if (codigo === 'PERFIL_REQUERIDO') return setPidiendo('perfil');
      alert(mensajeDeError(error));
    },
  });

  // La siguiente etapa es la única en la que se puede hacer clic.
  const siguiente = flujo.find((e) => e.secuencia > secuenciaActual);

  function alAvanzar() {
    // Textil entrando a Sublimación sin definir quién confecciona.
    if (
      tipoCodigo === 'TEXTIL' &&
      siguiente?.codigo === 'SUBLIMACION' &&
      !costureraId &&
      !sinConfeccion
    ) {
      return setPidiendo('costurera');
    }
    // La entrega siempre lleva observación.
    if (siguiente?.codigo === 'ENTREGADO') {
      return setPidiendo('nota');
    }
    avanzar.mutate({});
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

      {pidiendo === 'costurera' && (
        <ModalCosturera
          enviando={avanzar.isPending}
          onCerrar={() => setPidiendo(null)}
          onConfirmar={(cuerpo) => avanzar.mutate(cuerpo)}
        />
      )}

      {pidiendo === 'nota' && (
        <ModalNotaEntrega
          enviando={avanzar.isPending}
          onCerrar={() => setPidiendo(null)}
          onConfirmar={(nota) => avanzar.mutate({ nota })}
        />
      )}

      {pidiendo === 'perfil' && (
        <ModalPerfil
          enviando={avanzar.isPending}
          onCerrar={() => setPidiendo(null)}
          onConfirmar={(perfil) => avanzar.mutate({ perfilImpresion: perfil })}
        />
      )}

      {avisoWa && (
        <ModalWhatsapp aviso={avisoWa} onCerrar={() => setAvisoWa(null)} />
      )}
    </>
  );
}

function Caja({
  titulo, icono: Icono, onCerrar, cerrarAlTocarFuera = true, children,
}: {
  titulo: string;
  icono: typeof Scissors;
  onCerrar: () => void;
  cerrarAlTocarFuera?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      onClick={cerrarAlTocarFuera ? onCerrar : undefined}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Icono className="h-4 w-4 text-slate-400" />
            {titulo}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalCosturera({
  enviando, onCerrar, onConfirmar,
}: {
  enviando: boolean;
  onCerrar: () => void;
  onConfirmar: (cuerpo: Record<string, unknown>) => void;
}) {
  // '' = nada elegido, 'NA' = el cliente confecciona, número = costurera
  const [eleccion, setEleccion] = useState<'' | 'NA' | number>('');

  const { data: costureras = [], isLoading } = useQuery({
    queryKey: ['costureras'],
    queryFn: async () => (await api.get<any[]>('/costureras')).data,
  });

  function confirmar() {
    if (eleccion === '') return;
    if (eleccion === 'NA') return onConfirmar({ sinConfeccion: true });
    onConfirmar({ costureraId: Number(eleccion) });
  }

  return (
    <Caja titulo="Entrega a confección" icono={Scissors} onCerrar={onCerrar} cerrarAlTocarFuera={false}>
      <p className="mb-3 text-sm text-slate-500">
        Indique a quién se le entrega el trabajo para confeccionar.
      </p>

      {isLoading ? (
        <div className="grid place-items-center py-6">
          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {costureras.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEleccion(c.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5
                          text-left text-sm transition-all ${
                            eleccion === c.id
                              ? 'bg-marca-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                          }`}
            >
              <span className="font-medium">{c.nombre}</span>
              {c.telefono && (
                <span className={eleccion === c.id ? 'text-xs text-marca-100' : 'text-xs text-slate-400'}>
                  {c.telefono}
                </span>
              )}
            </button>
          ))}

          {/* El cliente se lleva solo la tela */}
          <button
            type="button"
            onClick={() => setEleccion('NA')}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm
                        transition-all ${
                          eleccion === 'NA'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-700 ring-1 ring-dashed ring-slate-300 hover:bg-slate-50'
                        }`}
          >
            <CircleSlash className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">N/A</span>
              <span className={`ml-1.5 text-xs ${eleccion === 'NA' ? 'text-slate-300' : 'text-slate-400'}`}>
                el cliente confecciona
              </span>
            </span>
          </button>

          {costureras.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              No hay costureras registradas. Pida a recepción que agregue una.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={confirmar} disabled={eleccion === '' || enviando}
          className="boton-primario flex-1">
          {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Confirmar y avanzar
        </button>
        <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
      </div>
    </Caja>
  );
}

function ModalNotaEntrega({
  enviando, onCerrar, onConfirmar,
}: {
  enviando: boolean;
  onCerrar: () => void;
  onConfirmar: (nota: string) => void;
}) {
  const [nota, setNota] = useState('');

  return (
    <Caja titulo="Registrar entrega" icono={PackageCheck} onCerrar={onCerrar} cerrarAlTocarFuera={false}>
      <p className="mb-3 text-sm text-slate-500">
        Escriba una observación de la entrega: quién retiró, si quedó algo pendiente, etc.
      </p>

      <textarea
        rows={3}
        className="campo resize-none"
        value={nota}
        autoFocus
        placeholder="Ej. Retirado por el cliente, conforme."
        onChange={(e) => setNota(e.target.value)}
      />

      <div className="mt-4 flex gap-2">
        <button onClick={() => onConfirmar(nota.trim())}
          disabled={nota.trim().length < 3 || enviando}
          className="boton-primario flex-1">
          {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Marcar como entregado
        </button>
        <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
      </div>
    </Caja>
  );
}

/** El textil no se imprime sin perfil definido: queda guardado en el trabajo. */
function ModalPerfil({
  enviando, onCerrar, onConfirmar,
}: {
  enviando: boolean;
  onCerrar: () => void;
  onConfirmar: (perfil: string) => void;
}) {
  const [perfil, setPerfil] = useState('');

  return (
    <Caja titulo="Perfil de impresión" icono={Printer} onCerrar={onCerrar} cerrarAlTocarFuera={false}>
      <p className="mb-3 text-sm text-slate-500">
        Indique con qué perfil se va a imprimir este trabajo. Queda guardado en la orden.
      </p>

      <input
        className="campo"
        value={perfil}
        autoFocus
        placeholder="Ej. Sublimación tela clara 200%"
        onChange={(e) => setPerfil(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && perfil.trim().length >= 3) onConfirmar(perfil.trim());
        }}
      />

      <div className="mt-4 flex gap-2">
        <button onClick={() => onConfirmar(perfil.trim())}
          disabled={perfil.trim().length < 3 || enviando}
          className="boton-primario flex-1">
          {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Guardar y avanzar
        </button>
        <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
      </div>
    </Caja>
  );
}

/**
 * Aparece al finalizar la orden. El enlace se abre con un clic del usuario,
 * que es la única forma en que el navegador no bloquea la ventana nueva.
 */
function ModalWhatsapp({
  aviso, onCerrar,
}: {
  aviso: AvisoWhatsapp;
  onCerrar: () => void;
}) {
  const cliente = useQueryClient();

  const marcar = useMutation({
    mutationFn: () => api.post(`/whatsapp/${aviso.id}/enviado`),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['whatsapp'] });
      onCerrar();
    },
  });

  return (
    <Caja titulo={`Orden #${aviso.numero_orden} lista`} icono={CircleCheck} onCerrar={onCerrar}
      cerrarAlTocarFuera={false}>
      <p className="mb-3 text-sm text-slate-500">
        Avísele a <strong className="text-slate-700">{aviso.cliente}</strong> que puede retirar.
      </p>

      <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600
                    ring-1 ring-slate-200">
        {aviso.mensaje}
      </p>

      <div className="mt-4 space-y-2">
        <a
          href={aviso.enlace}
          target="_blank"
          rel="noreferrer"
          onClick={() => marcar.mutate()}
          className="boton-primario w-full bg-emerald-600 hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir WhatsApp
        </a>

        <button onClick={onCerrar}
          className="w-full py-2 text-xs text-slate-400 hover:text-slate-600">
          Enviarlo después desde Notificaciones
        </button>
      </div>
    </Caja>
  );
}