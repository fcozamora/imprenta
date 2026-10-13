import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';
import { fecha } from '../lib/formato';

export default function ImprimirOrden() {
  const { id } = useParams();
  const navegar = useNavigate();

  const { data: orden, isLoading } = useQuery({
    queryKey: ['orden', id],
    queryFn: async () => (await api.get(`/ordenes/${id}`)).data,
  });

  // Abre el diálogo de impresión apenas carga.
  useEffect(() => {
    if (orden) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [orden]);

  if (isLoading || !orden) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
      </div>
    );
  }

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
        {/* ---------- Encabezado ---------- */}
        <header className="cabecera">
          <div className="cabecera-marca">
            <img src="/impresc.svg" alt="" className="logo-impreso" />
            <div>
              <h1 className="empresa">Orden de Trabajo</h1>
              <p className="tel">WhatsApp 2460-1930</p>
            </div>
          </div>
          <div className="numero-caja">
            <span className="numero-rotulo">Orden N°</span>
            <span className="numero">{orden.numero_orden}</span>
          </div>
        </header>

        {/* ---------- Cliente, fechas y envío de muestra ---------- */}
        <section>
          <div className="bloque">
            <div className="rejilla-4">
              <Dato rotulo="Cliente" valor={orden.cliente} ancho />
              <Dato rotulo="Cédula" valor={orden.cliente_cedula} />
              <Dato rotulo="Teléfono" valor={orden.telefono} />
              <Dato rotulo="Nombre comercial" valor={orden.nombre_comercial} />
              <Dato rotulo="Email facturación" valor={orden.email_facturacion} ancho />
              <Dato rotulo="Vendedor" valor={orden.vendedor} />
              <Dato rotulo="Recibido por" valor={orden.registrada_por} />
            </div>
            <div className="fechas">
              <div className="fecha-caja">
                <span className="fecha-rotulo">Ingreso</span>
                <span className="fecha-valor">{fecha(orden.fecha_ingreso)}</span>
              </div>
              <div className="fecha-caja resaltada">
                <span className="fecha-rotulo">Entrega</span>
                <span className="fecha-valor">{fecha(orden.fecha_entrega)}</span>
              </div>
            </div>
          </div>

          <div className="medio-muestra">
            <span className="medio-rotulo">Enviar muestra por</span>
            <span className="opcion">
              <span className={`casilla ${orden.medio_muestra === 'WHATSAPP' ? 'marcada' : ''}`} />
              WhatsApp {orden.telefono}
            </span>
            <span className="opcion">
              <span className={`casilla ${orden.medio_muestra === 'EMAIL' ? 'marcada' : ''}`} />
              Correo{' '}
              <span className="linea-correo">{orden.email_muestra ?? ''}</span>
            </span>
          </div>
        </section>

        {/* ---------- Trabajos ---------- */}
        <section className="trabajos">
          {orden.lineas.map((l: any, i: number) => (
            <article key={l.id} className="trabajo">
              <div className="trabajo-cabecera">
                <span className="trabajo-indice">{i + 1}</span>
                <span className="trabajo-nombre">{l.nombre_trabajo}</span>
                <span className="trabajo-tipo">{l.tipo_trabajo}</span>
                {l.archivo_sin_cambios === 1 && (
                  <span className="marca-sin-cambios">Archivo sin cambios</span>
                )}
                <span className="trabajo-entrega">Entrega {fecha(l.fecha_entrega)}</span>
              </div>
              <div className="trabajo-datos">
                <DetalleLinea linea={l} />
              </div>
              {l.observaciones && (
                <p className="observaciones">
                  <strong>Observaciones:</strong> {l.observaciones}
                </p>
              )}
            </article>
          ))}
        </section>

        {orden.observaciones && (
          <p className="observaciones-orden">
            <strong>Observaciones generales:</strong> {orden.observaciones}
          </p>
        )}

        {/* ---------- Firmas ---------- */}
        <footer className="firmas">
          <div className="firma"><span>Recibí conforme</span></div>
          <div className="firma"><span>Entregado por</span></div>
          <div className="firma"><span>Fecha de retiro</span></div>
        </footer>
      </div>
    </>
  );
}

function Dato({ rotulo, valor, ancho }: { rotulo: string; valor?: string | null; ancho?: boolean }) {
  return (
    <div className={ancho ? 'dato ancho' : 'dato'}>
      <span className="dato-rotulo">{rotulo}</span>
      <span className="dato-valor">{valor || '—'}</span>
    </div>
  );
}

/** Los campos varían según la categoría del trabajo. */
function DetalleLinea({ linea }: { linea: any }) {
  const d = linea.detalle;
  const campos: Array<[string, string]> = [];

  switch (linea.tipo_codigo) {
    case 'TALONARIOS':
      if (d) {
        campos.push(['Blocks', `${d.cantidad_blocks} de ${d.hojas_por_block}`]);
        campos.push(['Total hojas', String(d.total_hojas)]);
        campos.push(['Tamaño', d.tamano ?? d.tamano_otro ?? '—']);
        campos.push(['Copias', d.tipo_copia]);
        campos.push(['Tinta', d.tinta]);
        if (d.numeracion_inicial != null) {
          campos.push(['Numeración', `${d.numeracion_inicial} al ${d.numeracion_final}`]);
        }
        const acabados = [
          d.encolado && 'Encolado',
          d.perforado && 'Perforado',
          d.grapado && 'Grapado',
          d.carbon && 'Carbón',
        ].filter(Boolean);
        if (acabados.length) campos.push(['Acabados', acabados.join(', ')]);
        if (d.copias?.length) {
          campos.push(['Papeles', d.copias.map((c: any) => c.papel).join(' / ')]);
        }
      }
      break;
    case 'SOBRES':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tipo', d.tipo_sobre]);
        campos.push(['Tinta', d.tinta]);
      }
      break;
    case 'HP_LATEX':
    case 'IMPRESION_DIGITAL':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tamaño', d.tamano]);
        campos.push(['Material', d.material]);
      }
      break;
    case 'TEXTIL':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tela', d.tela]);
        if (d.perfil_impresion) campos.push(['Perfil', d.perfil_impresion]);
        if (d.costurera) campos.push(['Costurera', d.costurera]);
      }
      break;
    case 'SELLOS':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d?.codigo_sello) campos.push(['Código', d.codigo_sello]);
      if (d?.tinta) campos.push(['Tinta', d.tinta]);
      break;
    default:
      campos.push(['Cantidad', String(linea.cantidad)]);
  }

  return (
    <>
      {campos.map(([rotulo, valor]) => (
        <div key={rotulo} className="dato">
          <span className="dato-rotulo">{rotulo}</span>
          <span className="dato-valor">{valor}</span>
        </div>
      ))}
    </>
  );
}