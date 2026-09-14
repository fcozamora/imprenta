import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/sesion';
import { mensajeDeError } from '../lib/api';

export default function Login() {
  const { entrar } = useSesion();
  const navegar = useNavigate();

  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await entrar(cedula.trim(), password);
      navegar(usuario.requiereCambioPassword ? '/cambiar-password' : '/', { replace: true });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-8 text-center">
            <img src="/impresc.svg" alt="Imprenta SC" className="mx-auto mb-5 h-20 w-auto" />
            <h1 className="text-xl font-semibold text-slate-900">Órdenes de Trabajo</h1>
            <p className="mt-1 text-sm text-slate-500">Ingrese con su número de cédula</p>
        </div>
        </div>

        <form onSubmit={enviar} className="tarjeta space-y-4">
          <div>
            <label htmlFor="cedula" className="etiqueta">Cédula</label>
            <input
              id="cedula"
              className="campo"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="etiqueta">Contraseña</label>
            <input
              id="password"
              type="password"
              className="campo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <button type="submit" className="boton-primario w-full" disabled={enviando}>
            {enviando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {enviando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}