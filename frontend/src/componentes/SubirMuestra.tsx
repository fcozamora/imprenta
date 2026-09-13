import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LoaderCircle, ImageOff } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
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

  if (archivoSinCambios) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
        <ImageOff className="h-4 w-4 shrink-0" />
        Trabajo marcado como "Archivo sin cambios": no se sube muestra.
      </p>
    );
  }

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
          <a
            href={`/api/archivos/${vigente.id}`}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg ring-1 ring-slate-200 transition-shadow hover:shadow-md"
          >
            <img
              src={`/api/archivos/${vigente.id}`}
              alt={vigente.nombre_archivo}
              className="h-40 w-full bg-slate-50 object-contain"
              loading="lazy"
            />
          </a>
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
                  <a
                    key={a.id}
                    href={`/api/archivos/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`${a.subido_por} · ${fechaHora(a.subido_en)}`}
                    className="shrink-0 overflow-hidden rounded ring-1 ring-slate-200 transition-opacity hover:opacity-80"
                  >
                    <img
                      src={`/api/archivos/${a.id}`}
                      alt=""
                      className="h-14 w-14 bg-slate-50 object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}