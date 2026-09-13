import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';

export default function CambiarPassword() {
  const { usuario, refrescar } = useSesion();
  const navegar = useNavigate();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const obligatorio = usuario?.requiereCambioPassword;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError('');

    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/cambiar-password', { actual, nueva });
      await refrescar();
      navegar('/', { replace: true });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {obligatorio ? 'Debe cambiar su contraseña' : 'Cambiar contraseña'}
          </h1>
          {obligatorio && (
            <p className="mt-1 text-sm text-slate-500">
              Por seguridad, elija una contraseña propia antes de continuar.
            </p>
          )}
        </div>

        <form onSubmit={enviar} className="tarjeta space-y-4">
          <div>
            <label htmlFor="actual" className="etiqueta">Contraseña actual</label>
            <input
              id="actual"
              type="password"
              className="campo"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="nueva" className="etiqueta">Contraseña nueva</label>
            <input
              id="nueva"
              type="password"
              className="campo"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Mínimo 8 caracteres, con al menos una letra y un número.
            </p>
          </div>

          <div>
            <label htmlFor="confirmar" className="etiqueta">Repita la contraseña nueva</label>
            <input
              id="confirmar"
              type="password"
              className="campo"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
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
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}