import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Usuario } from './tipos';

interface Contexto {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (cedula: string, password: string) => Promise<Usuario>;
  salir: () => void;
  refrescar: () => Promise<void>;
  puede: (...permisos: string[]) => boolean;
}

const ContextoSesion = createContext<Contexto | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  async function refrescar() {
    const token = localStorage.getItem('token');
    if (!token) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    try {
      const { data } = await api.get<Usuario>('/auth/yo');
      setUsuario(data);
    } catch {
      localStorage.removeItem('token');
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    refrescar();
  }, []);

  async function entrar(cedula: string, password: string) {
    const { data } = await api.post<{ token: string; usuario: Usuario }>('/auth/login', {
      cedula,
      password,
    });
    localStorage.setItem('token', data.token);
    setUsuario(data.usuario);
    return data.usuario;
  }

  function salir() {
    localStorage.removeItem('token');
    setUsuario(null);
    location.href = '/login';
  }

  function puede(...permisos: string[]) {
    if (!usuario) return false;
    if (usuario.esAdmin) return true;
    return permisos.some((p) => usuario.permisos.includes(p));
  }

  return (
    <ContextoSesion.Provider value={{ usuario, cargando, entrar, salir, refrescar, puede }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return contexto;
}