import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserPlus, LoaderCircle, Pencil, Check } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';

export interface Cliente {
  id: number;
  cedula: string;
  nombre: string;
  nombre_comercial: string | null;
  telefono: string;
  telefono_wa: string | null;
  email_facturacion: string | null;
}

interface Props {
  cliente: Cliente | null;
  onCambio: (cliente: Cliente | null) => void;
}

export default function BuscadorCliente({ cliente, onCambio }: Props) {
  const queryCliente = useQueryClient();
  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '', nombreComercial: '', telefono: '', emailFacturacion: '',
  });

  // Busca sola 400 ms después de dejar de escribir.
  useEffect(() => {
    const termino = cedula.trim();
    if (termino.length < 5) {
      setNoEncontrado(false);
      return;
    }
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      setError('');
      try {
        const { data } = await api.get<Cliente | null>(`/clientes/cedula/${termino}`);
        if (data) {
          onCambio(data);
          setNoEncontrado(false);
          setEditando(false);
        } else {
          onCambio(null);
          setNoEncontrado(true);
          setEditando(true);
          setForm({ nombre: '', nombreComercial: '', telefono: '', emailFacturacion: '' });
        }
      } catch (e) {
        setError(mensajeDeError(e));
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [cedula]);

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        cedula: cedula.trim(),
        nombre: form.nombre.trim(),
        nombreComercial: form.nombreComercial.trim() || null,
        telefono: form.telefono.trim(),
        emailFacturacion: form.emailFacturacion.trim() || null,
      };
      if (cliente) {
        return (await api.patch<Cliente>(`/clientes/${cliente.id}`, cuerpo)).data;
      }
      return (await api.post<Cliente>('/clientes', cuerpo)).data;
    },
    onSuccess: (data) => {
      onCambio(data);
      setEditando(false);
      setNoEncontrado(false);
      setError('');
      queryCliente.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  function empezarEdicion() {
    if (!cliente) return;
    setForm({
      nombre: cliente.nombre,
      nombreComercial: cliente.nombre_comercial ?? '',
      telefono: cliente.telefono,
      emailFacturacion: cliente.email_facturacion ?? '',
    });
    setEditando(true);
  }

  return (
    <div className="tarjeta space-y-4">
      <h2 className="font-semibold text-slate-900">Cliente</h2>

      <div>
        <label className="etiqueta">Cédula <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            className="campo pr-9"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Escriba la cédula del cliente"
            autoFocus
          />
          {buscando && (
            <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      {/* Cliente encontrado, en modo lectura */}
      {cliente && !editando && (
        <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="font-medium text-slate-900">{cliente.nombre}</p>
              </div>
              <dl className="mt-1.5 space-y-0.5 text-sm text-slate-600">
                {cliente.nombre_comercial && <dd>{cliente.nombre_comercial}</dd>}
                <dd>Tel. {cliente.telefono}</dd>
                {cliente.email_facturacion && <dd>{cliente.email_facturacion}</dd>}
              </dl>
            </div>
            <button type="button" onClick={empezarEdicion} className="boton-secundario py-1.5 px-3 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          </div>
        </div>
      )}

      {noEncontrado && !cliente && (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          <UserPlus className="h-4 w-4 shrink-0" />
          Cliente nuevo. Complete los datos para registrarlo.
        </p>
      )}

      {/* Alta o edición */}
      {editando && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div>
            <label className="etiqueta">Nombre del cliente <span className="text-red-500">*</span></label>
            <input
              className="campo"
              value={form.nombre}
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
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="8888-7777"
              />
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending || !form.nombre.trim() || !form.telefono.trim()}
              className="boton-primario py-2 text-sm"
            >
              {guardar.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {cliente ? 'Guardar cambios' : 'Registrar cliente'}
            </button>
            {cliente && (
              <button type="button" onClick={() => setEditando(false)} className="boton-secundario py-2 text-sm">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
      )}
    </div>
  );
}