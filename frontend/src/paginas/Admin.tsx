import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, KeyRound, LoaderCircle, Search, CircleCheck, CircleSlash,
  Unlock, Pencil, X, Users, Briefcase, Palmtree,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { fechaHora } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import HistorialVacaciones from '../componentes/HistorialVacaciones';

interface UsuarioFila {
  id: number;
  cedula: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  puesto_id: number;
  puesto: string;
  telefono: string | null;
  email: string | null;
  es_admin: number;
  activo: number;
  requiere_cambio_password: number;
  ultimo_acceso: string | null;
  bloqueado_hasta: string | null;
}

interface Puesto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: number;
  usuarios: number;
  permisos: string[];
}

export default function Admin() {
  const [pestana, setPestana] = useState<'usuarios' | 'puestos'>('usuarios');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Administración</h1>

      <div className="flex gap-1 border-b border-slate-200">
        <Pestana activa={pestana === 'usuarios'} onClick={() => setPestana('usuarios')} icono={Users}>
          Usuarios
        </Pestana>
        <Pestana activa={pestana === 'puestos'} onClick={() => setPestana('puestos')} icono={Briefcase}>
          Puestos
        </Pestana>
      </div>

      {pestana === 'usuarios' ? <PanelUsuarios /> : <PanelPuestos />}
    </div>
  );
}

function Pestana({
  activa, onClick, icono: Icono, children,
}: {
  activa: boolean; onClick: () => void; icono: typeof Users; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium
                  transition-colors ${
                    activa
                      ? 'border-marca-600 text-marca-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
    >
      <Icono className="h-4 w-4" />
      {children}
    </button>
  );
}

// ==================================================================== Usuarios

function PanelUsuarios() {
  const cliente = useQueryClient();
  const { usuario: yo, puede } = useSesion();
  const puedeVacaciones = puede('vacaciones.gestionar');

  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState<UsuarioFila | 'nuevo' | null>(null);
  const [vacaciones, setVacaciones] = useState<UsuarioFila | null>(null);
  const [aviso, setAviso] = useState('');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['admin', 'usuarios', busqueda],
    queryFn: async () =>
      (await api.get<UsuarioFila[]>(`/admin/usuarios${busqueda ? `?q=${busqueda}` : ''}`)).data,
  });

  const { data: puestos = [] } = useQuery({
    queryKey: ['admin', 'puestos'],
    queryFn: async () => (await api.get<Puesto[]>('/admin/puestos')).data,
  });

  const resetear = useMutation({
    mutationFn: (id: number) => api.post(`/admin/usuarios/${id}/resetear-password`),
    onSuccess: ({ data }) => {
      setAviso(`Contraseña restablecida a: ${data.passwordTemporal}`);
      cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
    },
    onError: (e) => setAviso(mensajeDeError(e)),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.post(`/admin/usuarios/${id}/estado`, { activo }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
    onError: (e) => setAviso(mensajeDeError(e)),
  });

  const desbloquear = useMutation({
    mutationFn: (id: number) => api.post(`/admin/usuarios/${id}/desbloquear`),
    onSuccess: () => {
      setAviso('Cuenta desbloqueada');
      cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="campo pl-9 py-2"
            placeholder="Buscar por cédula o nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button onClick={() => setFormulario('nuevo')} className="boton-primario">
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {aviso && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-marca-50 px-4 py-3
                        text-sm text-marca-900 ring-1 ring-marca-200">
          <span>{aviso}</span>
          <button onClick={() => setAviso('')} className="text-marca-600 hover:text-marca-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs
                               font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Último acceso</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const bloqueado = u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date();
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/70 ${!u.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.cedula}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{u.nombre_completo}</span>
                        {u.es_admin === 1 && (
                          <span className="ml-1.5 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.puesto}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.ultimo_acceso ? fechaHora(u.ultimo_acceso) : 'Nunca ingresó'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {!u.activo && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                              inactivo
                            </span>
                          )}
                          {u.requiere_cambio_password === 1 && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                              clave temporal
                            </span>
                          )}
                          {bloqueado && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                              bloqueado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <BotonIcono
                            onClick={() => setFormulario(u)}
                            titulo="Editar"
                            icono={Pencil}
                          />
                          <BotonIcono
                            onClick={() => {
                              if (confirm(`¿Restablecer la contraseña de ${u.nombre_completo}?`))
                                resetear.mutate(u.id);
                            }}
                            titulo="Restablecer contraseña"
                            icono={KeyRound}
                          />
                          {puedeVacaciones && (
                            <BotonIcono
                              onClick={() => setVacaciones(u)}
                              titulo="Historial de vacaciones"
                              icono={Palmtree}
                            />
                          )}
                          {bloqueado && (
                            <BotonIcono
                              onClick={() => desbloquear.mutate(u.id)}
                              titulo="Desbloquear"
                              icono={Unlock}
                            />
                          )}
                          {u.id !== yo?.id && (
                            <BotonIcono
                              onClick={() =>
                                cambiarEstado.mutate({ id: u.id, activo: !u.activo })
                              }
                              titulo={u.activo ? 'Desactivar' : 'Activar'}
                              icono={u.activo ? CircleSlash : CircleCheck}
                              peligro={!!u.activo}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formulario && (
        <ModalUsuario
          usuario={formulario === 'nuevo' ? null : formulario}
          puestos={puestos}
          onCerrar={() => setFormulario(null)}
          onGuardado={(mensaje) => {
            setFormulario(null);
            setAviso(mensaje);
            cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
          }}
        />
      )}

      {vacaciones && (
        <HistorialVacaciones
          usuarioId={vacaciones.id}
          nombre={vacaciones.nombre_completo}
          puesto={vacaciones.puesto}
          onCerrar={() => setVacaciones(null)}
        />
      )}
    </div>
  );
}

function BotonIcono({
  onClick, titulo, icono: Icono, peligro,
}: {
  onClick: () => void; titulo: string; icono: typeof Pencil; peligro?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className={`grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors ${
        peligro ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icono className="h-4 w-4" />
    </button>
  );
}

function ModalUsuario({
  usuario, puestos, onCerrar, onGuardado,
}: {
  usuario: UsuarioFila | null;
  puestos: Puesto[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [form, setForm] = useState({
    cedula: usuario?.cedula ?? '',
    nombre: usuario?.nombre ?? '',
    apellido: usuario?.apellido ?? '',
    puestoId: usuario?.puesto_id ?? 0,
    telefono: usuario?.telefono ?? '',
    email: usuario?.email ?? '',
    esAdmin: usuario?.es_admin === 1,
  });
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        cedula: form.cedula.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        puestoId: Number(form.puestoId),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        esAdmin: form.esAdmin,
      };
      if (usuario) return (await api.patch(`/admin/usuarios/${usuario.id}`, cuerpo)).data;
      return (await api.post('/admin/usuarios', cuerpo)).data;
    },
    onSuccess: (data: any) => {
      onGuardado(
        usuario
          ? 'Usuario actualizado'
          : `Usuario creado. Contraseña temporal: ${data.passwordTemporal}`
      );
    },
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {usuario ? 'Editar usuario' : 'Nuevo usuario'}
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
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Nombre <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="etiqueta">Apellido <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="etiqueta">Puesto <span className="text-red-500">*</span></label>
            <select
              className="campo"
              value={form.puestoId}
              onChange={(e) => setForm({ ...form, puestoId: Number(e.target.value) })}
            >
              <option value={0}>Seleccione</option>
              {puestos.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Teléfono</label>
              <input
                className="campo"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="etiqueta">Correo</label>
              <input
                type="email"
                className="campo"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.esAdmin}
              onChange={(e) => setForm({ ...form, esAdmin: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
            />
            Acceso de administrador
          </label>

          {!usuario && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              La cuenta se crea con una contraseña temporal. El usuario deberá cambiarla
              la primera vez que ingrese.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => guardar.mutate()}
              disabled={
                guardar.isPending || !form.cedula.trim() || !form.nombre.trim() ||
                !form.apellido.trim() || !form.puestoId
              }
              className="boton-primario flex-1"
            >
              {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
            <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================== Puestos

function PanelPuestos() {
  const cliente = useQueryClient();
  const [editando, setEditando] = useState<Puesto | null>(null);

  const { data: puestos = [], isLoading } = useQuery({
    queryKey: ['admin', 'puestos'],
    queryFn: async () => (await api.get<Puesto[]>('/admin/puestos')).data,
  });

  const { data: permisos = [] } = useQuery({
    queryKey: ['admin', 'permisos'],
    queryFn: async () =>
      (await api.get<Array<{ codigo: string; modulo: string; descripcion: string }>>('/admin/permisos')).data,
  });

  const guardarPermisos = useMutation({
    mutationFn: ({ id, codigos }: { id: number; codigos: string[] }) =>
      api.put(`/admin/puestos/${id}/permisos`, { permisos: codigos }),
    onSuccess: () => {
      setEditando(null);
      cliente.invalidateQueries({ queryKey: ['admin', 'puestos'] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
      </div>
    );
  }

  // Permisos agrupados por módulo, para que el formulario sea legible.
  const porModulo = permisos.reduce<Record<string, typeof permisos>>((acc, p) => {
    (acc[p.modulo] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {puestos.map((p) => (
        <div key={p.id} className="tarjeta">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
              <p className="text-xs text-slate-500">
                {p.usuarios} usuario{p.usuarios === 1 ? '' : 's'} · {p.permisos.length} permisos
              </p>
            </div>
            <button
              onClick={() => setEditando(p)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400
                         transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="Editar permisos"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {editando && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => setEditando(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Permisos de {editando.nombre}</h2>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(porModulo).map(([modulo, lista]) => (
                <div key={modulo}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {modulo}
                  </h4>
                  <div className="space-y-1">
                    {lista.map((permiso) => (
                      <label
                        key={permiso.codigo}
                        className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5
                                   text-sm hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={editando.permisos.includes(permiso.codigo)}
                          onChange={(e) =>
                            setEditando({
                              ...editando,
                              permisos: e.target.checked
                                ? [...editando.permisos, permiso.codigo]
                                : editando.permisos.filter((c) => c !== permiso.codigo),
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
                        />
                        <span className="text-slate-700">{permiso.descripcion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-slate-100 bg-white pt-3">
              <button
                onClick={() =>
                  guardarPermisos.mutate({ id: editando.id, codigos: editando.permisos })
                }
                disabled={guardarPermisos.isPending}
                className="boton-primario flex-1"
              >
                {guardarPermisos.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Guardar permisos
              </button>
              <button onClick={() => setEditando(null)} className="boton-secundario">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
