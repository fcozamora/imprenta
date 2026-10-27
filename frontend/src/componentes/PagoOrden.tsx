import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CircleCheck, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fechaHora } from '../lib/formato';

export interface ResumenPago {
  total: number;
  abonado: number;
  saldo: number;
  aFavor: number;
  estado: 'SIN_PRECIO' | 'PENDIENTE' | 'ABONADO' | 'CANCELADA';
  precioIncompleto: boolean;
}

export type MetodoPago = 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE';

/** Con qué pagó el cliente. El orden es el de uso en el mostrador. */
export const METODOS_PAGO: Array<[MetodoPago, string]> = [
  ['EFECTIVO', 'Efectivo'],
  ['SINPE', 'Sinpe'],
  ['TRANSFERENCIA', 'Transferencia'],
  ['TARJETA', 'Tarjeta'],
  ['CHEQUE', 'Cheque'],
];

const NOMBRE_METODO = Object.fromEntries(METODOS_PAGO) as Record<MetodoPago, string>;

export interface Abono {
  id: number;
  monto: string;
  metodo_pago: MetodoPago | null;
  nota: string | null;
  creado_en: string;
  registrado_por: string;
}

export const colones = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Los botones del método de pago. Se usa igual en la ventana de anotar un
 * pago y en el bloque de "¿Deja algo pagado?" de la orden nueva.
 */
export function SelectorMetodo({
  valor, onCambio,
}: {
  valor: MetodoPago | '';
  onCambio: (m: MetodoPago) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {METODOS_PAGO.map(([codigo, texto]) => (
        <button
          key={codigo}
          type="button"
          onClick={() => onCambio(codigo)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                      active:scale-95 ${
                        valor === codigo
                          ? 'bg-marca-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                      }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

const ROTULO: Record<ResumenPago['estado'], { texto: string; clase: string }> = {
  SIN_PRECIO: { texto: 'Sin precio', clase: 'bg-slate-200 text-slate-600' },
  PENDIENTE: { texto: 'Sin pagar', clase: 'bg-amber-100 text-amber-700' },
  ABONADO: { texto: 'Abonada', clase: 'bg-sky-100 text-sky-700' },
  CANCELADA: { texto: 'Cancelada', clase: 'bg-emerald-100 text-emerald-700' },
};

/**
 * Estado de pago de la orden. El total es la suma de los precios de sus
 * trabajos y el estado sale de lo abonado: cuando los abonos alcanzan el
 * total, queda cancelada sola.
 */
export default function PagoOrden({
  ordenId, pago, abonos,
}: {
  ordenId: number;
  pago: ResumenPago;
  abonos: Abono[];
}) {
  const { puede } = useSesion();
  const cliente = useQueryClient();
  const [abriendo, setAbriendo] = useState(false);

  const anota = puede('pagos.registrar');
  const rotulo = ROTULO[pago.estado];

  const refrescar = () => {
    cliente.invalidateQueries({ queryKey: ['orden'] });
    cliente.invalidateQueries({ queryKey: ['ordenes'] });
  };

  const quitar = useMutation({
    mutationFn: (id: number) => api.delete(`/abonos/${id}`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  return (
    <div className="tarjeta">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Banknote className="h-4 w-4 text-slate-400" />
          Pago
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rotulo.clase}`}>
            {rotulo.texto}
          </span>
        </h3>
        {anota && pago.estado !== 'SIN_PRECIO' && pago.saldo > 0 && (
          <button onClick={() => setAbriendo(true)} className="boton-secundario py-1.5 px-3 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Anotar pago
          </button>
        )}
      </div>

      {pago.estado === 'SIN_PRECIO' ? (
        <p className="text-sm text-slate-500">
          Los trabajos de esta orden todavía no tienen precio anotado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([
              ['Total', pago.total, 'text-slate-900'],
              ['Abonado', pago.abonado, 'text-sky-700'],
              [
                pago.aFavor > 0 ? 'A favor' : 'Saldo',
                pago.aFavor > 0 ? pago.aFavor : pago.saldo,
                pago.aFavor > 0 ? 'text-violet-700' : pago.saldo > 0 ? 'text-amber-700' : 'text-emerald-700',
              ],
            ] as const).map(([texto, valor, color]) => (
              <div key={texto} className="rounded-lg bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{texto}</p>
                <p className={`text-sm font-semibold ${color}`}>{colones(valor)}</p>
              </div>
            ))}
          </div>

          {pago.precioIncompleto && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Hay trabajos sin precio anotado: el total todavía no está completo.
            </p>
          )}

          {pago.estado === 'CANCELADA' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
              <CircleCheck className="h-3.5 w-3.5" />
              Los abonos cubren el total de la orden.
            </p>
          )}

          {abonos.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-1">
              {abonos.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                      {colones(Number(a.monto))}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          a.metodo_pago
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {a.metodo_pago ? NOMBRE_METODO[a.metodo_pago] : 'Sin anotar'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.registrado_por} · {fechaHora(a.creado_en)}
                    </p>
                    {a.nota && <p className="text-xs text-slate-500">{a.nota}</p>}
                  </div>
                  {anota && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Quitar el abono de ${colones(Number(a.monto))}?`))
                          quitar.mutate(a.id);
                      }}
                      title="Quitar este abono"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400
                                 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {abriendo && (
        <ModalAbono
          ordenId={ordenId}
          saldo={pago.saldo}
          onCerrar={() => setAbriendo(false)}
          onGuardado={() => { setAbriendo(false); refrescar(); }}
        />
      )}
    </div>
  );
}

function ModalAbono({
  ordenId, saldo, onCerrar, onGuardado,
}: {
  ordenId: number;
  saldo: number;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  // Saldar es "canceló todo el saldo": el monto lo calcula el servidor, para
  // que sea exactamente lo que falta aunque el precio haya cambiado recién.
  const [saldar, setSaldar] = useState(false);
  const [monto, setMonto] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<MetodoPago | ''>('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api.post(`/ordenes/${ordenId}/abonos`, {
        ...(saldar ? { saldar: true } : { monto: Number(monto) }),
        metodo,
        nota: nota.trim() || undefined,
      }),
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const cuanto = saldar ? saldo : Number(monto || 0);
  const restante = saldo - cuanto;
  const listo = metodo !== '' && cuanto > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Banknote className="h-4 w-4 text-slate-400" />
            Anotar pago
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-500">
          Saldo pendiente: <strong className="text-slate-900">{colones(saldo)}</strong>
        </p>

        <button
          type="button"
          onClick={() => { setSaldar(!saldar); setMonto(''); }}
          className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5
                      text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                        saldar
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50'
                      }`}
        >
          <CircleCheck className="h-4 w-4" />
          Canceló todo el saldo
        </button>

        <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {saldar ? 'o anote solo una parte' : 'o abona una parte'}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="etiqueta">Monto</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ₡
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="campo pl-7 disabled:bg-slate-50 disabled:text-slate-500"
                value={saldar ? saldo : monto}
                disabled={saldar}
                autoFocus
                placeholder="0.00"
                onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            {cuanto > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {restante <= 0
                  ? 'Cubre el saldo: la orden queda cancelada.'
                  : `Quedaría un saldo de ${colones(restante)}.`}
              </p>
            )}
          </div>

          <div>
            <label className="etiqueta">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <SelectorMetodo valor={metodo} onCambio={setMetodo} />
          </div>

          <div>
            <label className="etiqueta">Nota</label>
            <input
              className="campo"
              value={nota}
              placeholder="Ej. Recibo 1042, paga el hijo"
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending || !listo}
              className={`boton-primario flex-1 ${
                saldar ? 'bg-emerald-600 hover:bg-emerald-700' : ''
              }`}
            >
              {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saldar ? `Cancelar la orden con ${colones(saldo)}` : 'Anotar abono'}
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cerrar</button>
          </div>
          {!listo && cuanto > 0 && (
            <p className="text-xs text-slate-500">Falta escoger con qué pagó el cliente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
