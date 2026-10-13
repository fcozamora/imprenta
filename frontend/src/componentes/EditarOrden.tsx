import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, X, Zap, Pencil } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';

interface Props {
  orden: any;
  onCerrar: () => void;
}

export default function EditarOrden({ orden, onCerrar }: Props) {
  const cliente = useQueryClient();
  const { data: catalogos } = useCatalogos();

  const [vendedorId, setVendedorId] = useState<number>(orden.vendedor_id);
  const [observaciones, setObservaciones] = useState(orden.observaciones ?? '');
  const [urgente, setUrgente] = useState(orden.urgente === 1);
  const [motivoUrgencia, setMotivoUrgencia] = useState(orden.motivo_urgencia ?? '');
  const [fechaEntrega, setFechaEntrega] = useState(
    (orden.fecha_entrega ?? '').slice(0, 10)
  );
  const [medioMuestra, setMedioMuestra] = useState<'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | ''>(
    orden.medio_muestra ?? ''
  );
  const [emailMuestra, setEmailMuestra] = useState(orden.email_muestra ?? '');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/ordenes/${orden.id}`, {
        vendedorId,
        observaciones: observaciones.trim() || null,
        urgente,
        motivoUrgencia: urgente ? motivoUrgencia.trim() || null : null,
        fechaEntrega: fechaEntrega || null,
        medioMuestra: medioMuestra || null,
        emailMuestra: medioMuestra === 'EMAIL' ? emailMuestra.trim() || null : null,
      }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['orden'] });
      cliente.invalidateQueries({ queryKey: ['ordenes'] });
      onCerrar();
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Pencil className="h-4 w-4 text-slate-400" />
            Editar orden #{orden.numero_orden}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="etiqueta">Vendedor</label>
            <select
              className="campo"
              value={vendedorId}
              onChange={(e) => setVendedorId(Number(e.target.value))}
            >
              {catalogos?.vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiqueta">Observaciones</label>
            <textarea
              rows={3}
              className="campo resize-none"
              value={observaciones}
              placeholder="Instrucciones o detalles de la orden"
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div>
            <label className="etiqueta">Enviar muestra por</label>
            <div className="flex flex-wrap gap-2">
              {([
                ['WHATSAPP', 'WhatsApp'],
                ['EMAIL', 'Correo'],
                ['VENDEDOR', 'Muestra a vendedor(a)'],
              ] as const).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setMedioMuestra(medioMuestra === valor ? '' : valor)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                    medioMuestra === valor
                      ? 'bg-marca-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            {medioMuestra === 'EMAIL' && (
              <input
                type="email"
                className="campo mt-2"
                value={emailMuestra}
                placeholder="correo@ejemplo.com"
                onChange={(e) => setEmailMuestra(e.target.value)}
              />
            )}
          </div>

          {/* Urgencia y fecha */}
          <div className="border-t border-slate-100 pt-3">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-red-50 px-3 py-2
                              text-sm font-medium text-red-800 ring-1 ring-red-200">
              <input
                type="checkbox"
                checked={urgente}
                onChange={(e) => {
                  setUrgente(e.target.checked);
                  if (!e.target.checked) setMotivoUrgencia('');
                }}
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-600"
              />
              <Zap className="h-4 w-4" />
              Orden urgente
            </label>

            {urgente && (
              <div className="mt-3">
                <label className="etiqueta">Motivo</label>
                <input
                  className="campo"
                  value={motivoUrgencia}
                  placeholder="Ej. El cliente lo necesita para un evento"
                  onChange={(e) => setMotivoUrgencia(e.target.value)}
                />
              </div>
            )}

            <div className="mt-3">
              <label className="etiqueta">Fecha de entrega</label>
              <input
                type="date"
                className="campo"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Cambiarla aquí la aplica a todos los trabajos de la orden.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending}
              className="boton-primario flex-1"
            >
              {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}