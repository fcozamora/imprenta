import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';

const MINIMO = 1;
const MAXIMO = 8;

/**
 * Visor de una muestra. Abre siempre con la imagen completa —por grande que
 * sea el archivo— y de ahí se le hace zoom y se arrastra para recorrerla.
 *
 * La escala 1 es "entra completa": el tamaño real lo pone el navegador con
 * object-contain, y el zoom solo multiplica sobre eso.
 */
export default function VisorImagen({
  url, nombre, onCerrar,
}: {
  url: string;
  nombre?: string;
  onCerrar: () => void;
}) {
  const [escala, setEscala] = useState(1);
  const [desplazamiento, setDesplazamiento] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);

  const reajustar = useCallback(() => {
    setEscala(1);
    setDesplazamiento({ x: 0, y: 0 });
  }, []);

  /** Al alejar hasta que entra completa, se vuelve a centrar sola. */
  const cambiarEscala = useCallback((siguiente: number) => {
    const limitada = Math.min(MAXIMO, Math.max(MINIMO, Number(siguiente.toFixed(2))));
    setEscala(limitada);
    if (limitada === MINIMO) setDesplazamiento({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === '+' || e.key === '=') setEscala((s) => Math.min(MAXIMO, s + 0.5));
      else if (e.key === '-' || e.key === '_') cambiarEscala(escala - 0.5);
      else if (e.key === '0') reajustar();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar, reajustar, cambiarEscala, escala]);

  function alSoltarRueda(e: React.WheelEvent) {
    cambiarEscala(escala + (e.deltaY < 0 ? 0.4 : -0.4));
  }

  function empezarArrastre(e: React.PointerEvent) {
    if (escala === MINIMO) return;
    arrastre.current = { x: e.clientX - desplazamiento.x, y: e.clientY - desplazamiento.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function moverArrastre(e: React.PointerEvent) {
    if (!arrastre.current) return;
    setDesplazamiento({
      x: e.clientX - arrastre.current.x,
      y: e.clientY - arrastre.current.y,
    });
  }

  function soltarArrastre(e: React.PointerEvent) {
    arrastre.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  const puedeArrastrar = escala > MINIMO;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-900/90"
      onClick={onCerrar}
    >
      {/* ---------- Controles ---------- */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {nombre && <p className="mr-auto truncate text-sm text-white/80">{nombre}</p>}
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => cambiarEscala(escala - 0.5)}
            disabled={escala === MINIMO}
            title="Alejar"
            className="grid h-8 w-8 place-items-center rounded transition-colors
                       hover:bg-white/15 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-xs font-medium tabular-nums">
            {Math.round(escala * 100)}%
          </span>
          <button
            type="button"
            onClick={() => cambiarEscala(escala + 0.5)}
            disabled={escala === MAXIMO}
            title="Acercar"
            className="grid h-8 w-8 place-items-center rounded transition-colors
                       hover:bg-white/15 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={reajustar}
            disabled={escala === MINIMO}
            title="Ver completa"
            className="grid h-8 w-8 place-items-center rounded transition-colors
                       hover:bg-white/15 disabled:opacity-40"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          title="Cerrar"
          className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ---------- Imagen ---------- */}
      <div
        className="min-h-0 flex-1 overflow-hidden"
        onWheel={alSoltarRueda}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={nombre ?? ''}
          draggable={false}
          onDoubleClick={() => (escala === MINIMO ? cambiarEscala(2.5) : reajustar())}
          onPointerDown={empezarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={soltarArrastre}
          onPointerCancel={soltarArrastre}
          style={{
            transform: `translate(${desplazamiento.x}px, ${desplazamiento.y}px) scale(${escala})`,
            touchAction: 'none',
          }}
          className={`mx-auto block h-full w-full select-none object-contain
                      ${puedeArrastrar ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        />
      </div>

      <p
        className="shrink-0 px-4 pb-3 text-center text-xs text-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        {puedeArrastrar
          ? 'Arrastre para recorrer la imagen · doble clic para verla completa'
          : 'Doble clic o rueda del mouse para acercar · Esc para cerrar'}
      </p>
    </div>
  );
}
