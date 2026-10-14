import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';
import { fecha } from '../lib/formato';

type Direccion = 'ENVIADA' | 'RECIBIDA';

interface Encomienda {
  id: number;
  fecha: string;
  direccion: Direccion;
  numero_guia: string | null;
  status: 'CONTADO' | 'POR_COBRAR' | null;
  monto: string | null;
  persona_envia: string | null;
  persona_recibe: string | null;
  destino: string | null;
  retirado_por: string | null;
  notas: string | null;
  entregada_en: string | null;
}

function colones(valor: string | null) {
  if (valor == null) return '—';
  return `₡${Number(valor).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function textoStatus(s: Encomienda['status']) {
  if (s === 'CONTADO') return 'Contado';
  if (s === 'POR_COBRAR') return 'Por cobrar';
  return '—';
}

export default function TraliImprimir() {
  const navegar = useNavigate();
  const [params] = useSearchParams();

  const desde = params.get('desde') ?? '';
  const hasta = params.get('hasta') ?? '';
  const entregadas = params.get('entregadas') === 'true';

  function traer(direccion: Direccion) {
    return async () => {
      const p = new URLSearchParams({ direccion, desde, hasta });
      if (entregadas) p.set('entregadas', 'true');
      return (await api.get<Encomienda[]>(`/trali?${p}`)).data;
    };
  }

  const enviadas = useQuery({
    queryKey: ['trali-reporte', 'ENVIADA', desde, hasta, entregadas],
    queryFn: traer('ENVIADA'),
  });
  const recibidas = useQuery({
    queryKey: ['trali-reporte', 'RECIBIDA', desde, hasta, entregadas],
    queryFn: traer('RECIBIDA'),
  });

  const listo = !enviadas.isLoading && !recibidas.isLoading;

  // Abre el dialogo de impresion apenas estan las dos listas.
  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [listo]);

  if (!listo) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
      </div>
    );
  }

  const listaEnviadas = enviadas.data ?? [];
  const listaRecibidas = recibidas.data ?? [];
  const impreso = new Date().toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      {/* Barra que no se imprime */}
      <div className="no-imprimir flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button onClick={() => navegar(-1)} className="boton-secundario py-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button onClick={() => window.print()} className="boton-primario py-2 text-sm">
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
        <span className="ml-2 text-xs text-slate-500">Tamaño carta, horizontal</span>
      </div>

      <div className="hoja">
        <header className="cabecera">
          <div className="cabecera-marca">
            <img src="/impresc.svg" alt="" className="logo-impreso" />
            <div>
              <h1 className="reporte-titulo">Reporte de encomiendas · Trali</h1>
              <p className="reporte-periodo">
                Período del {fecha(desde)} al {fecha(hasta)} · Impreso el {impreso}
              </p>
            </div>
          </div>
        </header>

        {/* ---------- Enviadas a San José ---------- */}
        <h2 className="seccion-titulo">
          Enviadas a San José
          <span className="seccion-conteo">
            {listaEnviadas.length} encomienda{listaEnviadas.length === 1 ? '' : 's'}
          </span>
        </h2>

        {listaEnviadas.length === 0 ? (
          <p className="sin-datos">No hay encomiendas enviadas en este período.</p>
        ) : (
          <table className="tabla-reporte">
            <thead>
              <tr>
                <th className="col-fecha">Fecha</th>
                <th className="col-guia">N. de guía</th>
                <th className="col-status">Status</th>
                <th>Persona que envía</th>
                <th>Persona que recibe</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {listaEnviadas.map((f) => (
                <tr key={f.id}>
                  <td>{fecha(f.fecha)}</td>
                  <td className="monoespaciado">{f.numero_guia ?? '—'}</td>
                  <td>{textoStatus(f.status)}</td>
                  <td>{f.persona_envia ?? '—'}</td>
                  <td>{f.persona_recibe ?? '—'}</td>
                  <td>{f.destino ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ---------- Recibidas en San Carlos ---------- */}
        <h2 className="seccion-titulo">
          Recibidas en San Carlos
          <span className="seccion-conteo">
            {listaRecibidas.length} encomienda{listaRecibidas.length === 1 ? '' : 's'}
          </span>
        </h2>

        {listaRecibidas.length === 0 ? (
          <p className="sin-datos">No hay encomiendas recibidas en este período.</p>
        ) : (
          <table className="tabla-reporte tabla-firmas">
            <thead>
              <tr>
                <th className="col-fecha">Fecha</th>
                <th className="col-guia">N. de guía</th>
                <th className="col-status">Status</th>
                <th className="col-monto">Monto</th>
                <th>Persona que envía</th>
                <th>Persona que recibe</th>
                <th>Retirado por</th>
                <th className="col-firma">Firma de quien Retira</th>
              </tr>
            </thead>
            <tbody>
              {listaRecibidas.map((f) => (
                <tr key={f.id}>
                  <td>{fecha(f.fecha)}</td>
                  <td className="monoespaciado">{f.numero_guia ?? '—'}</td>
                  <td>{textoStatus(f.status)}</td>
                  <td className="derecha">{colones(f.monto)}</td>
                  <td>{f.persona_envia ?? '—'}</td>
                  <td>{f.persona_recibe ?? '—'}</td>
                  <td>{f.retirado_por ?? '—'}</td>
                  <td className="celda-firma"></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ---------- Firmas ---------- */}
        <div className="firmas-reporte">
          <div className="firma">
            <span>Firma por Imprenta San Carlos</span>
          </div>
          <div className="firma">
            <span>Firma por Trali</span>
          </div>
        </div>
      </div>
    </>
  );
}
