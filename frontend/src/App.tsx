import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { ProveedorSesion, useSesion } from './lib/sesion';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import CambiarPassword from './paginas/CambiarPassword';
import Ordenes from './paginas/Ordenes';
import NuevaOrden from './paginas/NuevaOrden';
import DetalleOrden from './paginas/DetalleOrden';
import ImprimirOrden from './paginas/ImprimirOrden';
import Clientes from './paginas/Clientes';
import DetalleCliente from './paginas/DetalleCliente';
import Sellos from './paginas/Sellos';
import Materiales from './paginas/Materiales';
import Bitacora from './paginas/Bitacora';
import Reportes from './paginas/Reportes';
import Notificaciones from './paginas/Notificaciones';
import Admin from './paginas/Admin';
import Costureras from './paginas/Costureras';
import ConfeccionTextil from './paginas/ConfeccionTextil';
import Papeles from './paginas/Papeles';
import Camisetas from './paginas/Camisetas';
import Trali from './paginas/Trali';
import TraliImprimir from './paginas/TraliImprimir';
import PedidosExternos from './paginas/PedidosExternos';
import MaterialesImpresion from './paginas/MaterialesImpresion';
import Vacaciones from './paginas/Vacaciones';

const cliente = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function Cargando() {
  return (
    <div className="min-h-screen grid place-items-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-marca-600" />
    </div>
  );
}

function RutaProtegida() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.requiereCambioPassword) return <Navigate to="/cambiar-password" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorSesion>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />

            <Route element={<RutaProtegida />}>
              {/* Sin layout: la hoja de impresión va limpia */}
              <Route path="/ordenes/:id/imprimir" element={<ImprimirOrden />} />
              <Route path="/trali/imprimir" element={<TraliImprimir />} />

              <Route element={<Layout />}>
                <Route path="/" element={<Ordenes />} />
                <Route path="/confeccion" element={<ConfeccionTextil />} />
                <Route path="/ordenes/nueva" element={<NuevaOrden />} />
                <Route path="/ordenes/:id/editar" element={<NuevaOrden />} />
                <Route path="/ordenes/numero/:numero" element={<DetalleOrden />} />
                <Route path="/ordenes/:id" element={<DetalleOrden />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<DetalleCliente />} />
                <Route path="/sellos" element={<Sellos />} />
                <Route path="/materiales" element={<Materiales />} />
                <Route path="/materiales/:id" element={<Materiales />} />
                <Route path="/bitacora" element={<Bitacora />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/notificaciones" element={<Notificaciones />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/costureras" element={<Costureras />} />
                <Route path="/papeles" element={<Papeles />} />
                <Route path="/camisetas" element={<Camisetas />} />
                <Route path="/camisetas/:id" element={<Camisetas />} />
                <Route path="/trali" element={<Trali />} />
                <Route path="/pedidos-externos" element={<PedidosExternos />} />
                <Route path="/materiales-impresion" element={<MaterialesImpresion />} />
                <Route path="/vacaciones" element={<Vacaciones />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ProveedorSesion>
    </QueryClientProvider>
  );
}