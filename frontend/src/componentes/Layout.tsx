import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Printer, LayoutDashboard, FilePlus2, Users, Stamp, Package,
  ClipboardList, BarChart3, Settings, LogOut, Menu, X, Search, Bell, Scissors,Shirt, FileStack, Truck, PackageOpen, Layers, Palmtree, Receipt } from 'lucide-react';
import { useSesion } from '../lib/sesion';
import Campana from './Campana';


/** Lo que el servidor cuenta como pendiente de atender. */
interface Pendientes {
  materiales: number;
  camisetas: number;
  vacaciones: number;
  pagosFijos: number;
}

interface ItemMenu {
  a: string;
  texto: string;
  icono: typeof Printer;
  permisos?: string[];
  /** Marca el ícono con un círculo cuando hay cosas esperando. */
  pendientes?: keyof Pendientes;
}

const MENU: ItemMenu[] = [
  { a: '/', texto: 'Órdenes', icono: LayoutDashboard },
  { a: '/ordenes/nueva', texto: 'Nueva orden', icono: FilePlus2, permisos: ['ordenes.crear'] },
  { a: '/clientes', texto: 'Clientes', icono: Users, permisos: ['clientes.gestionar'] },
  { a: '/sellos', texto: 'Sellos', icono: Stamp, permisos: ['sellos.ver'] },
  { a: '/materiales', texto: 'Materiales', icono: Package, permisos: ['materiales.solicitar', 'materiales.atender'], pendientes: 'materiales' },
  { a: '/camisetas', texto: 'Camisetas', icono: Shirt, permisos: ['camisetas.solicitar', 'camisetas.atender'], pendientes: 'camisetas' },
  { a: '/trali', texto: 'Trali', icono: Truck, permisos: ['trali.gestionar'] },
  { a: '/pedidos-externos', texto: 'Pedidos Externos', icono: PackageOpen, permisos: ['pedidos_externos.gestionar'] },
  { a: '/vacaciones', texto: 'Vacaciones', icono: Palmtree, permisos: ['vacaciones.solicitar'], pendientes: 'vacaciones' },
  { a: '/notificaciones', texto: 'Notificaciones', icono: Bell },
  { a: '/bitacora', texto: 'Bitácora', icono: ClipboardList, permisos: ['bitacora.ver'] },
  { a: '/reportes', texto: 'Reportes', icono: BarChart3, permisos: ['reportes.generar'] },
  { a: '/control-pagos', texto: 'Control de pagos', icono: Receipt, permisos: ['pagos_fijos.gestionar'], pendientes: 'pagosFijos' },
  { a: '/papeles', texto: 'Papeles', icono: FileStack, permisos: ['catalogos.gestionar', 'papeles.gestionar', 'papeles.movimientos'] },
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

  // Lo que está esperando que alguien lo atienda. Se refresca solo cada
  // minuto, así el círculo aparece sin tener que recargar la pantalla.
  const { data: pendientes } = useQuery({
    queryKey: ['pendientes'],
    queryFn: async () => (await api.get<Pendientes>('/pendientes')).data,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const iniciales = usuario?.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  /** El mismo buscador sirve para la fila de arriba y para la de teléfono. */
  function barraBusqueda(clase: string) {
    return (
      <form onSubmit={buscar} className={clase}>
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
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4
                               -translate-y-1/2 text-slate-400" />
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
    );
  }

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

          {barraBusqueda('ml-2 hidden max-w-lg flex-1 sm:block')}

          <div className="ml-auto flex items-center gap-1">
            <Campana />

            <div className="ml-2 flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-marca-100 text-xs font-semibold text-marca-700">
                {iniciales}
              </div>
              {/* En tablet el nombre le robaba el ancho al buscador. */}
              <div className="hidden leading-tight lg:block">
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

        {/* En un teléfono el buscador queda en 44 píxeles al lado del logo:
            ahí baja a su propia fila, donde sí se ve lo que uno escribe. */}
        <div className="border-t border-slate-100 px-3 pb-2 pt-1.5 sm:hidden">
          {barraBusqueda('')}
        </div>
      </header>

      <div className="flex">
        {/* ---------- Menú lateral ---------- */}
        {/* El menú es una columna con su propio scroll: en una pantalla baja
            —un portátil chico, una tablet acostada— los últimos renglones
            quedaban fuera y no había cómo alcanzarlos. */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200
                      bg-white pt-[6.75rem] transition-transform duration-200 sm:pt-14
                      lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]
                      lg:translate-x-0 lg:pt-0
                      ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
            {visibles.map(({ a, texto, icono: Icono, pendientes: clave }) => {
              const cuantos = clave ? (pendientes?.[clave] ?? 0) : 0;
              return (
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
                  title={
                    cuantos > 0
                      ? `${cuantos} ${cuantos === 1 ? 'pendiente' : 'pendientes'} de atender`
                      : undefined
                  }
                >
                  <span className="relative shrink-0">
                    <Icono className="h-4.5 w-4.5" />
                    {cuantos > 0 && (
                      <span
                        className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center
                                   rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none
                                   text-white ring-2 ring-white"
                      >
                        {cuantos > 9 ? '9+' : cuantos}
                      </span>
                    )}
                  </span>
                  {texto}
                </NavLink>
              );
            })}
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