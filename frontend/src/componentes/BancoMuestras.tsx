import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Images, LoaderCircle, Search, X, ZoomIn } from 'lucide-react';
import { api } from '../lib/api';
import { fecha } from '../lib/formato';
import ImagenProtegida from './ImagenProtegida';
import VisorImagen from './VisorImagen';

export interface MuestraDelBanco {
  id: number;
  nombre_archivo: string;
  nombre_trabajo: string;
  tipo_trabajo: string;
  numero_orden: number;
  subido_por: string;
  subido_en: string;
  versiones: number;
}

export function useMuestrasDelCliente(clienteId: number | null) {
  return useQuery({
    queryKey: ['muestras', 'cliente', clienteId],
    queryFn: async () =>
      (await api.get<MuestraDelBanco[]>(`/clientes/${clienteId}/muestras`)).data,
    enabled: clienteId != null,
    staleTime: 60_000,
  });
}

/**
 * Las muestras que ya tiene el cliente, una por trabajo y siempre la
 * última versión que subió el diseñador. Se escoge una en vez de volver
 * a sacar la foto de la computadora.
 */
export default function BancoMuestras({
  clienteId, nombreTrabajo, onEscoger, onCerrar,
}: {
  clienteId: number;
  nombreTrabajo?: string;
  onEscoger: (muestra: MuestraDelBanco) => void;
  onCerrar: () => void;
}) {
  const { data: muestras = [], isLoading } = useMuestrasDelCliente(clienteId);
  // Si el trabajo ya tiene nombre, se arranca buscando por él.
  const [busqueda, setBusqueda] = useState(nombreTrabajo?.trim() ?? '');
  // El recorte de la miniatura esconde parte del dibujo: la lupa la abre entera.
  const [ampliada, setAmpliada] = useState<{ url: string; nombre?: string } | null>(null);

  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? muestras.filter(
        (m) =>
          m.nombre_trabajo.toLowerCase().includes(texto) ||
          m.tipo_trabajo.toLowerCase().includes(texto) ||
          String(m.numero_orden).includes(texto)
      )
    : muestras;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Muestras de este cliente</h2>
            <p className="text-sm text-slate-500">
              Una por trabajo, siempre la última versión.
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {muestras.length > 1 && (
          <div className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="campo pl-9"
                value={busqueda}
                autoFocus
                placeholder="Buscar por trabajo o número de orden"
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {texto && visibles.length < muestras.length && (
              <p className="mt-1.5 text-xs text-slate-500">
                Mostrando {visibles.length} de {muestras.length}.{' '}
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="font-medium text-marca-600 hover:underline"
                >
                  Ver todas
                </button>
              </p>
            )}
          </div>
        )}

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <div className="grid place-items-center py-16">
              <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
            </div>
          ) : muestras.length === 0 ? (
            <div className="grid place-items-center py-14 text-center">
              <Images className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700">
                Este cliente todavía no tiene muestras guardadas
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjunte la foto desde la computadora; de ahí en adelante queda en el banco.
              </p>
            </div>
          ) : visibles.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-500">
              Ninguna muestra coincide con “{busqueda}”.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {visibles.map((m) => (
                <div key={m.id} className="relative">
                <button
                  type="button"
                  onClick={() => onEscoger(m)}
                  className="flex w-full items-start gap-3 rounded-lg p-2 text-left ring-1 ring-slate-200
                             transition-colors hover:bg-marca-50 hover:ring-marca-300"
                >
                  <ImagenProtegida
                    id={m.id}
                    alt={m.nombre_trabajo}
                    className="h-20 w-20 shrink-0 rounded bg-slate-50 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{m.nombre_trabajo}</p>
                    <p className="text-xs text-slate-500">{m.tipo_trabajo}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Orden #{m.numero_orden} · {fecha(m.subido_en)}
                    </p>
                    <p className="truncate text-xs text-slate-400">{m.subido_por}</p>
                    {m.versiones > 1 && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {m.versiones} versiones, esta es la última
                      </p>
                    )}
                  </div>
                </button>
                <VerCompleta
                  id={m.id}
                  nombre={m.nombre_trabajo}
                  onAmpliar={setAmpliada}
                />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {ampliada && (
        <VisorImagen
          url={ampliada.url}
          nombre={ampliada.nombre}
          onCerrar={() => {
            // Esta copia se bajó solo para verla: se suelta al cerrar.
            URL.revokeObjectURL(ampliada.url);
            setAmpliada(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Lupa encima de la miniatura, que está recortada para que quepa. Va aparte
 * del botón de la tarjeta porque un botón dentro de otro no es HTML válido,
 * y baja la imagen solo cuando se le da clic, no de entrada.
 */
function VerCompleta({
  id, nombre, onAmpliar,
}: {
  id: number;
  nombre: string;
  onAmpliar: (v: { url: string; nombre: string }) => void;
}) {
  const [bajando, setBajando] = useState(false);

  async function abrir() {
    setBajando(true);
    try {
      const { data } = await api.get(`/archivos/${id}`, { responseType: 'blob' });
      onAmpliar({ url: URL.createObjectURL(data as Blob), nombre });
    } finally {
      setBajando(false);
    }
  }

  return (
    <button
      type="button"
      title="Ver completa"
      onClick={abrir}
      disabled={bajando}
      className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded bg-slate-900/60
                 text-white transition-opacity hover:bg-slate-900/80 disabled:opacity-50"
    >
      {bajando ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ZoomIn className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
