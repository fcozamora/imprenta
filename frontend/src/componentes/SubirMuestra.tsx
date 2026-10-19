import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LoaderCircle, ImageOff, Expand } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { fechaHora } from '../lib/formato';

interface Archivo {
  id: number;
  nombre_archivo: string;
  bytes: number;
  subido_en: string;
  subido_por: string;
}

/**
 * Las imágenes están detrás del token, así que una etiqueta <img> normal
 * no puede pedirlas: el navegador no manda el encabezado de autorización.
 * Se descargan con el cliente de la API y se muestran desde memoria.
 */
function useImagenProtegida(id: number) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    let creada: string | null = null;

    api
      .get(`/archivos/${id}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!vigente) return;
        creada = URL.createObjectURL(data as Blob);
        setUrl(creada);
      })
      .catch(() => {
        if (vigente) setError(true);
      });

    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [id]);

  return { url, error };
}

function Imagen({
  id, alt, className, onAmpliar,
}: {
  id: number;
  alt: string;
  className: string;
  onAmpliar?: (url: string) => void;
}) {
  const { url, error } = useImagenProtegida(id);

  if (error) {
    return (
      <div className={`${className} grid place-items-center bg-slate-100`}>
        <ImageOff className="h-5 w-5 text-slate-300" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`${className} grid place-items-center bg-slate-50`}>
        <LoaderCircle className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onClick={() => onAmpliar?.(url)}
      loading="lazy"
    />
  );
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
  const [ampliada, setAmpliada] = useState<string | null>(null);

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

  // La más reciente va primero: es la versión vigente.
  const [vigente, ...anteriores] = archivos;

  return (
    <div className="space-y-2">
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
          Sin muestras cargadas
        </p>
      ) : (
        <div className="space-y-2">
          <div className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
            <Imagen
              id={vigente.id}
              alt={vigente.nombre_archivo}
              className="h-40 w-full cursor-zoom-in bg-slate-50 object-contain"
              onAmpliar={setAmpliada}
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
                    <Imagen
                      id={a.id}
                      alt=""
                      className="h-14 w-14 cursor-zoom-in bg-slate-50 object-cover"
                      onAmpliar={setAmpliada}
                    />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Vista ampliada */}
      {ampliada && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/80 p-6"
          onClick={() => setAmpliada(null)}
        >
          <img
            src={ampliada}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-xs text-white/70">
            Haga clic fuera de la imagen para cerrar
          </p>
        </div>
      )}
    </div>
  );
}