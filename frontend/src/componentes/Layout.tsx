import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Printer, LayoutDashboard, FilePlus2, Users, Stamp, Package,
  ClipboardList, BarChart3, Settings, LogOut, Menu, X, Search, Bell, Scissors,Shirt, FileStack, Truck, PackageOpen, Layers } from 'lucide-react';
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
  { a: '/camisetas', texto: 'Camisetas', icono: Shirt, permisos: ['camisetas.solicitar', 'camisetas.atender'] },
  { a: '/trali', texto: 'Trali', icono: Truck, permisos: ['trali.gestionar'] },
  { a: '/pedidos-externos', texto: 'Pedidos Externos', icono: PackageOpen, permisos: ['pedidos_externos.gestionar'] },
  { a: '/notificaciones', texto: 'Notificaciones', icono: Bell },
  { a: '/bitacora', texto: 'Bitácora', icono: ClipboardList, permisos: ['bitacora.ver'] },
  { a: '/reportes', texto: 'Reportes', icono: BarChart3, permisos: ['reportes.generar'] },
  { a: '/papeles', texto: 'Papeles', icono: FileStack, permisos: ['catalogos.gestionar'] },
  { a: '/materiales-impresion', texto: 'Materiales de impresión', icono: Layers, permisos: ['materiales.catalogo'] },
  { a: '/admin', texto: 'Administración', icono: Settings, permisos: ['usuarios.gestionar'] },
  { a: '/costureras', texto: 'Costureras', icono: Scissors, permisos: ['costureras.gestionar'] },
  { a: '/confeccion', texto: 'Confección textil', icono: Shirt, permisos: ['confeccion.ver'] },
];

export default function Layout() {
  const { usuario, salir, puede } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [campo, setCampo] = useState<'CLIENTE' | 'ORDEN' | 'TELEFONO'>('CLIENTE');
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
    // Un número de orden lleva directo a esa orden; lo demás filtra el listado.
    if (campo === 'ORDEN') {
      navegar(`/ordenes/numero/${termino.replace(/\D/g, '')}`);
    } else {
      navegar(`/?q=${encodeURIComponent(termino)}&campo=${campo}`);
    }
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

          <form onSubmit={buscar} className="ml-2 flex-1 max-w-lg">
            <div className="flex rounded-lg ring-1 ring-slate-300 transition-shadow
                            focus-within:ring-2 focus-within:ring-marca-600">
              <select
                value={campo}
                onChange={(e) => setCampo(e.target.value as typeof campo)}
                aria-label="Buscar por"
                className="shrink-0 rounded-l-lg border-0 bg-slate-50 py-2 pl-3 pr-7 text-sm
                           font-medium text-slate-600 focus:outline-none"
              >
                <option value="CLIENTE">Cliente</option>
                <option value="ORDEN">Orden</option>
                <option value="TELEFONO">Teléfono</option>
              </select>

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  inputMode={campo === 'CLIENTE' ? 'text' : 'numeric'}
                  placeholder={
                    campo === 'ORDEN'
                      ? 'Número de orden'
                      : campo === 'TELEFONO'
                        ? 'Teléfono del cliente'
                        : 'Nombre o cédula del cliente'
                  }
                  className="w-full rounded-r-lg border-0 bg-white py-2 pl-8 pr-3 text-sm
                             text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
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