import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LoaderCircle, ImageOff, Expand } from 'lucide-react';
import ImagenProtegida from './ImagenProtegida';
import VisorImagen from './VisorImagen';
import { api, mensajeDeError } from '../lib/api';
import { useZonaArrastre } from '../lib/arrastre';
import { fechaHora } from '../lib/formato';

interface Archivo {
  id: number;
  nombre_archivo: string;
  bytes: number;
  subido_en: string;
  subido_por: string;
}

interface Props {
  lineaId: number;
  archivoSinCambios: boolean;
  puedeSubir: boolean;
}

export default function SubirMuestra({ lineaId, archivoSinCambios, puedeSubir }: Props) {
  const cliente = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [ampliada, setAmpliada] = useState<{ url: string; nombre?: string } | null>(null);

  const { data: archivos = [], isLoading } = useQuery({
    queryKey: ['archivos', lineaId],
    queryFn: async () => (await api.get<Archivo[]>(`/lineas/${lineaId}/archivos`)).data,
  });

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      const datos = new FormData();
      datos.append('imagen', archivo);
      return api.post(`/lineas/${lineaId}/archivos`, datos);
    },
    onSuccess: () => {
      setError('');
      cliente.invalidateQueries({ queryKey: ['archivos', lineaId] });
      if (entrada.current) entrada.current.value = '';
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  // Se puede soltar la foto encima en vez de buscarla en la computadora.
  const arrastre = useZonaArrastre(
    (archivo) => subir.mutate(archivo),
    (mensaje) => setError(mensaje)
  );

  // La más reciente va primero: es la versión vigente.
  const [vigente, ...anteriores] = archivos;

  return (
    <div
      className={`space-y-2 rounded-lg transition-colors ${
        puedeSubir && arrastre.encima ? 'bg-marca-50 ring-2 ring-marca-400' : ''
      }`}
      {...(puedeSubir ? arrastre.props : {})}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Muestra del trabajo
        </h4>
        {puedeSubir && (
          <>
            <input
              ref={entrada}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) subir.mutate(archivo);
              }}
            />
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              disabled={subir.isPending}
              className="boton-secundario py-1.5 px-3 text-xs"
            >
              {subir.isPending ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Subir imagen
            </button>
          </>
        )}
      </div>

      {archivoSinCambios && (
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 ring-1 ring-sky-200">
          <ImageOff className="h-4 w-4 shrink-0" />
          Trabajo de archivo, sin cambios. Igual se le puede adjuntar la foto de la muestra.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="grid h-24 place-items-center rounded-lg bg-slate-50">
          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : archivos.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
          {puedeSubir
            ? 'Sin muestras cargadas. Arrastre la foto aquí o use el botón de arriba.'
            : 'Sin muestras cargadas'}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
            <ImagenProtegida
              id={vigente.id}
              alt={vigente.nombre_archivo}
              className="h-40 w-full cursor-zoom-in bg-slate-50 object-contain"
              onAmpliar={(url) => setAmpliada({ url, nombre: vigente.nombre_archivo })}
            />
            <span className="pointer-events-none absolute right-2 top-2 rounded bg-slate-900/60 p-1
                             opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="h-3.5 w-3.5 text-white" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {vigente.subido_por} · {fechaHora(vigente.subido_en)}
          </p>

          {anteriores.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                Versiones anteriores ({anteriores.length})
              </summary>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {anteriores.map((a) => (
                  <div
                    key={a.id}
                    title={`${a.subido_por} · ${fechaHora(a.subido_en)}`}
                    className="shrink-0 overflow-hidden rounded ring-1 ring-slate-200
                               transition-opacity hover:opacity-80"
                  >
                    <ImagenProtegida
                      id={a.id}
                      alt=""
                      className="h-14 w-14 cursor-zoom-in bg-slate-50 object-cover"
                      onAmpliar={(url) => setAmpliada({ url, nombre: a.nombre_archivo })}
                    />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {ampliada && (
        <VisorImagen
          url={ampliada.url}
          nombre={ampliada.nombre}
          onCerrar={() => setAmpliada(null)}
        />
      )}

    </div>
  );
}