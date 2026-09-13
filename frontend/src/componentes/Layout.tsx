import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Printer, LayoutDashboard, FilePlus2, Users, Stamp, Package,
  ClipboardList, BarChart3, Settings, LogOut, Menu, X, Search, Bell, Scissors,
} from 'lucide-react';
import { useSesion } from '../lib/sesion';
import Campana from './Campana';


interface ItemMenu {
  a: string;
  texto: string;
  icono: typeof Printer;
  permisos?: string[];
}

const MENU: ItemMenu[] = [
  { a: '/', texto: 'Órdenes', icono: LayoutDashboard },
  { a: '/ordenes/nueva', texto: 'Nueva orden', icono: FilePlus2, permisos: ['ordenes.crear'] },
  { a: '/clientes', texto: 'Clientes', icono: Users, permisos: ['clientes.gestionar'] },
  { a: '/sellos', texto: 'Sellos', icono: Stamp, permisos: ['sellos.ver'] },
  { a: '/materiales', texto: 'Materiales', icono: Package, permisos: ['materiales.solicitar', 'materiales.atender'] },
    { a: '/notificaciones', texto: 'Notificaciones', icono: Bell },
  { a: '/bitacora', texto: 'Bitácora', icono: ClipboardList, permisos: ['bitacora.ver'] },
  { a: '/reportes', texto: 'Reportes', icono: BarChart3, permisos: ['reportes.generar'] },
  { a: '/admin', texto: 'Administración', icono: Settings, permisos: ['usuarios.gestionar'] },
  { a: '/costureras', texto: 'Costureras', icono: Scissors, permisos: ['costureras.gestionar'] },
];

export default function Layout() {
  const { usuario, salir, puede } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const navegar = useNavigate();

  const visibles = MENU.filter((i) => !i.permisos || puede(...i.permisos));

  const iniciales = usuario?.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    const termino = busqueda.trim();
    if (!termino) return;
    // Si son solo dígitos lo tratamos como número de orden.
    navegar(/^\d+$/.test(termino) ? `/ordenes/numero/${termino}` : `/?q=${encodeURIComponent(termino)}`);
    setBusqueda('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---------- Barra superior ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600
                       transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Menú"
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2">
            <img src="/impresc.svg" alt="Imprenta SC" className="h-8 w-auto" />
          </div>

          <form onSubmit={buscar} className="ml-2 flex-1 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por orden, cédula, cliente o teléfono"
                className="campo pl-9 py-2"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Campana />

            <div className="ml-2 flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-marca-100 text-xs font-semibold text-marca-700">
                {iniciales}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-slate-900">{usuario?.nombre}</p>
                <p className="text-xs text-slate-500">{usuario?.puesto}</p>
              </div>
              <button
                onClick={salir}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500
                           transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ---------- Menú lateral ---------- */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-200 bg-white
                      pt-14 transition-transform duration-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]
                      lg:translate-x-0 lg:pt-0
                      ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <nav className="space-y-0.5 p-3">
            {visibles.map(({ a, texto, icono: Icono }) => (
              <NavLink
                key={a}
                to={a}
                end={a === '/'}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                   transition-colors duration-150 ${
                     isActive
                       ? 'bg-marca-50 text-marca-700'
                       : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                   }`
                }
              >
                <Icono className="h-4.5 w-4.5 shrink-0" />
                {texto}
              </NavLink>
            ))}
          </nav>
        </aside>

        {menuAbierto && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden"
            onClick={() => setMenuAbierto(false)}
          />
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}