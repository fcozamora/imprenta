import { useState, type DragEvent } from 'react';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png'];

/**
 * Deja soltar una foto encima de un recuadro en vez de buscarla en la
 * computadora. Devuelve los manejadores para pegarle a un <div> y si
 * en este momento hay algo encima, para resaltarlo.
 */
export function useZonaArrastre(
  alSoltar: (archivo: File) => void,
  alRechazar?: (mensaje: string) => void
) {
  const [encima, setEncima] = useState(false);

  function hayArchivo(e: DragEvent) {
    return Array.from(e.dataTransfer?.types ?? []).includes('Files');
  }

  const props = {
    onDragOver: (e: DragEvent) => {
      if (!hayArchivo(e)) return;
      e.preventDefault();
      setEncima(true);
    },
    onDragLeave: (e: DragEvent) => {
      // Entrar a un hijo dispara dragleave en el padre: se ignora.
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setEncima(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hayArchivo(e)) return;
      e.preventDefault();
      setEncima(false);
      const archivo = e.dataTransfer.files?.[0];
      if (!archivo) return;
      if (!TIPOS_IMAGEN.includes(archivo.type)) {
        alRechazar?.('Solo se aceptan imágenes JPG o PNG');
        return;
      }
      alSoltar(archivo);
    },
  };

  return { encima, props };
}
