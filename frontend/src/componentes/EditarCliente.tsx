import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, X, UserPen } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';

interface Props {
  cliente: any;
  onCerrar: () => void;
}

export default function EditarCliente({ cliente, onCerrar }: Props) {
  const query = useQueryClient();
  const [form, setForm] = useState({
    cedula: cliente.cedula ?? '',
    nombre: cliente.nombre ?? '',
    nombreComercial: cliente.nombre_comercial ?? '',
    telefono: cliente.telefono ?? '',
    emailFacturacion: cliente.email_facturacion ?? '',
    notas: cliente.notas ?? '',
  });
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/clientes/${cliente.id}`, {
        cedula: form.cedula.trim(),
        nombre: form.nombre.trim(),
        nombreComercial: form.nombreComercial.trim() || null,
        telefono: form.telefono.trim(),
        emailFacturacion: form.emailFacturacion.trim() || null,
        notas: form.notas.trim() || null,
      }),
    onSuccess: () => {
      query.invalidateQueries({ queryKey: ['cliente'] });
      query.invalidateQueries({ queryKey: ['clientes'] });
      query.invalidateQueries({ queryKey: ['ordenes'] });
      onCerrar();
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <UserPen className="h-4 w-4 text-slate-400" />
            Editar cliente
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="etiqueta">Cédula <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
          </div>

          <div>
            <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={form.nombre}
              autoFocus
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div>
            <label className="etiqueta">Nombre comercial</label>
            <input
              className="campo"
              value={form.nombreComercial}
              onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Teléfono <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={form.telefono}
                placeholder="8888-7777"
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                El número de WhatsApp se recalcula solo.
              </p>
            </div>
            <div>
              <label className="etiqueta">Email de facturación</label>
              <input
                type="email"
                className="campo"
                value={form.emailFacturacion}
                onChange={(e) => setForm({ ...form, emailFacturacion: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="etiqueta">Notas</label>
            <textarea
              rows={2}
              className="campo resize-none"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
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
              disabled={guardar.isPending || !form.nombre.trim() || !form.telefono.trim()}
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