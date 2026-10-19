import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Las imágenes están detrás del token, así que una etiqueta <img> normal
 * no puede pedirlas: el navegador no manda el encabezado de autorización.
 * Se descargan con el cliente de la API y se muestran desde memoria.
 */
export function useImagenProtegida(id: number | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (id == null) {
      setUrl(null);
      setError(false);
      return;
    }

    let vigente = true;
    let creada: string | null = null;
    setUrl(null);
    setError(false);

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

export default function ImagenProtegida({
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
