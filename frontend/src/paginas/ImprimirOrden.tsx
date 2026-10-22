import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha } from '../lib/formato';

const colones = (v: number) =>
  `₡${v.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImprimirOrden() {
  const { id } = useParams();
  const navegar = useNavigate();
  // La hoja que imprime produccion sale sin precios.
  const { puede } = useSesion();
  const verPrecio = puede('ordenes.ver_precio');

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
                {verPrecio && l.precio != null && (
                  <span className="trabajo-precio">{colones(Number(l.precio))}</span>
                )}
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

        {verPrecio && orden.lineas.some((l: any) => l.precio != null) && (
          <>
            <div className="total-orden">
              <span>Total de la orden</span>
              <strong>
                {colones(
                  orden.lineas.reduce((s: number, l: any) => s + Number(l.precio ?? 0), 0)
                )}
              </strong>
            </div>
            {orden.pago && orden.pago.abonado > 0 && (
              <div className="total-orden sin-linea">
                {orden.pago.estado === 'CANCELADA' ? (
                  <strong>CANCELADA</strong>
                ) : (
                  <>
                    <span>Abonado {colones(orden.pago.abonado)}</span>
                    <strong>Saldo {colones(orden.pago.saldo)}</strong>
                  </>
                )}
              </div>
            )}
          </>
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
  // El tercer valor es cuántas columnas ocupa: los campos largos —papeles,
  // acabados, tamaños escritos a mano— piden más espacio para no partirse
  // en pedacitos dentro de una columna angosta.
  const campos: Array<[string, string, number?]> = [];

  switch (linea.tipo_codigo) {
    case 'TALONARIOS':
      if (d) {
        campos.push(['Blocks', `${d.cantidad_blocks} de ${d.hojas_por_block}`]);
        campos.push(['Total hojas', String(d.total_hojas)]);
        campos.push(['Tamaño', d.tamano ?? d.tamano_otro ?? '—', 2]);
        campos.push(['Copias', d.tipo_copia]);
        campos.push(['Tinta', d.tinta, 2]);
        if (d.numeracion_inicial != null) {
          campos.push(['Numeración', `${d.numeracion_inicial} al ${d.numeracion_final}`]);
        }
        const acabados = [
          d.encolado && 'Encolado',
          d.perforado && 'Perforado',
          d.grapado && 'Grapado',
          d.carbon && 'Carbón',
        ].filter(Boolean);
        if (acabados.length) campos.push(['Acabados', acabados.join(', '), 2]);
        if (d.copias?.length) {
          campos.push(['Papeles', d.copias.map((c: any) => c.papel).join(' / '), 3]);
        }
      }
      break;
    case 'SOBRES':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tipo', d.tipo_sobre, 2]);
        campos.push(['Tinta', d.tinta, 2]);
      }
      break;
    case 'HP_LATEX':
    case 'IMPRESION_DIGITAL':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tamaño', d.tamano, 2]);
        campos.push(['Material', d.material, 2]);
      }
      break;
    case 'TEXTIL':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d) {
        campos.push(['Tela', d.tela, 2]);
        if (d.perfil_impresion) campos.push(['Perfil', d.perfil_impresion, 2]);
        if (d.costurera) campos.push(['Costurera', d.costurera, 2]);
      }
      break;
    case 'SELLOS':
      campos.push(['Cantidad', String(linea.cantidad)]);
      if (d?.codigo_sello) campos.push(['Código', d.codigo_sello, 2]);
      if (d?.tinta) campos.push(['Tinta', d.tinta, 2]);
      break;
    default:
      campos.push(['Cantidad', String(linea.cantidad)]);
  }

  return (
    <>
      {campos.map(([rotulo, valor, columnas]) => (
        <div
          key={rotulo}
          className={columnas === 3 ? 'dato muy-ancho' : columnas === 2 ? 'dato ancho' : 'dato'}
        >
          <span className="dato-rotulo">{rotulo}</span>
          <span className="dato-valor">{valor}</span>
        </div>
      ))}
    </>
  );
}