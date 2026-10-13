import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Plus, LoaderCircle, CircleCheck, Printer, Zap } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';
import BuscadorCliente, { type Cliente } from '../componentes/BuscadorCliente';
import LineaTrabajo, { lineaVacia, rolDeCopia, type DatosLinea } from '../componentes/LineaTrabajo';

export default function NuevaOrden() {
  const navegar = useNavigate();
  const { data: catalogos, isLoading } = useCatalogos();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendedorId, setVendedorId] = useState<number | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [medioMuestra, setMedioMuestra] = useState<'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | ''>('');
  const [emailMuestra, setEmailMuestra] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [motivoUrgencia, setMotivoUrgencia] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [lineas, setLineas] = useState<DatosLinea[]>([lineaVacia()]);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<{
    id: number;
    numero_orden: number;
    fecha_entrega: string;
  } | null>(null);

  function actualizarLinea(clave: string, cambios: Partial<DatosLinea>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  function limpiar() {
    setCreada(null);
    setCliente(null);
    setVendedorId('');
    setObservaciones('');
    setMedioMuestra('');
    setEmailMuestra('');
    setUrgente(false);
    setMotivoUrgencia('');
    setFechaEntrega('');
    setLineas([lineaVacia()]);
  }

  const crear = useMutation({
    mutationFn: async () => {
      if (!cliente) throw new Error('Debe seleccionar un cliente');
      if (!vendedorId) throw new Error('Debe seleccionar un vendedor');

      const cuerpo = {
        clienteId: cliente.id,
        vendedorId: Number(vendedorId),
        medioMuestra: medioMuestra || null,
        emailMuestra: medioMuestra === 'EMAIL' ? emailMuestra.trim() || null : null,
        urgente,
        motivoUrgencia: urgente ? motivoUrgencia.trim() || null : null,
        fechaEntrega: urgente && fechaEntrega ? fechaEntrega : null,
        observaciones: observaciones.trim() || null,
        lineas: lineas.map((l) => {
          const tipo = catalogos!.tiposTrabajo.find((t) => t.id === l.tipoTrabajoId);
          const codigo = tipo?.codigo;

          const base = {
            tipoTrabajoId: Number(l.tipoTrabajoId),
            nombreTrabajo: l.nombreTrabajo.trim(),
            cantidad: Number(l.cantidad) || 1,
            archivoSinCambios: l.archivoSinCambios,
            observaciones: l.observaciones.trim() || null,
          };

          switch (codigo) {
            case 'TALONARIOS': {
              const total =
                catalogos!.tiposCopia.find((c) => c.id === l.tipoCopiaId)?.cantidad_hojas ?? 0;
              return {
                ...base,
                talonario: {
                  cantidadBlocks: Number(l.cantidadBlocks),
                  hojasPorBlock: Number(l.hojasPorBlock),
                  tamanoId: l.tamanoId ? Number(l.tamanoId) : null,
                  tamanoOtro: l.tamanoOtro.trim() || null,
                  tipoCopiaId: Number(l.tipoCopiaId),
                  tinta: l.tinta.trim(),
                  encolado: l.encolado,
                  perforado: l.perforado,
                  grapado: l.grapado,
                  carbon: l.carbon,
                  numeracionInicial:
                    l.numeracionInicial === '' ? null : Number(l.numeracionInicial),
                  copias: l.papeles
                    .map((papelId, i) => ({
                      posicion: i + 1,
                      rol: rolDeCopia(i + 1, total),
                      papelId,
                    }))
                    .filter((c) => c.papelId > 0),
                },
              };
            }
            case 'SOBRES':
              return { ...base, sobre: { tipoSobreId: Number(l.tipoSobreId), tinta: l.tinta.trim() } };
            case 'HP_LATEX':
            case 'IMPRESION_DIGITAL':
              return { ...base, latex: { tamano: l.tamano.trim(), materialId: Number(l.materialId) } };
            case 'TEXTIL':
              return {
                ...base,
                textil: {
                  telaId: Number(l.telaId),
                  perfilImpresion: l.perfilImpresion.trim() || null,
                },
              };
            case 'SELLOS':
              return {
                ...base,
                sello: {
                  codigoSello: l.codigoSello.trim() || null,
                  tintaId: l.tintaId ? Number(l.tintaId) : null,
                },
              };
            default:
              return base;
          }
        }),
      };

      return (await api.post('/ordenes', cuerpo)).data;
    },
    onSuccess: (data: any) => setCreada(data),
    onError: (e) =>
      setError(e instanceof Error && !('response' in e) ? e.message : mensajeDeError(e)),
  });

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError('');
    crear.mutate();
  }

  if (isLoading || !catalogos) {
    return (
      <div className="grid place-items-center py-20">
        <LoaderCircle className="h-7 w-7 animate-spin text-marca-600" />
      </div>
    );
  }

  // ---------- Confirmación ----------
  if (creada) {
    return (
      <div className="mx-auto max-w-md">
        <div className="tarjeta text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
            <CircleCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Orden registrada</h1>
          <p className="mt-3 text-3xl font-bold text-marca-700">#{creada.numero_orden}</p>
          <p className="mt-2 text-sm text-slate-600">
            Entrega estimada: {creada.fecha_entrega?.slice(0, 10).split('-').reverse().join('/')}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Se generó el mensaje de WhatsApp para el cliente.
          </p>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => navegar(`/ordenes/${creada.id}/imprimir`)}
              className="boton-primario w-full"
            >
              <Printer className="h-4 w-4" />
              Imprimir orden
            </button>
            <div className="flex gap-2">
              <button onClick={limpiar} className="boton-secundario flex-1">
                Otra orden
              </button>
              <button onClick={() => navegar('/')} className="boton-secundario flex-1">
                Ver órdenes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nueva orden</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          El número de orden se asigna automáticamente al guardar.
        </p>
      </div>

      <BuscadorCliente cliente={cliente} onCambio={setCliente} />

      <div className="tarjeta space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta">
              Vendedor <span className="text-red-500">*</span>
            </label>
            <select
              className="campo"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Seleccione</option>
              {catalogos.vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Observaciones de la orden</label>
            <input
              className="campo"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        {/* Canal para hacerle llegar la muestra al cliente */}
        <div>
          <label className="etiqueta">Enviar muestra por</label>
          <div className="flex flex-wrap gap-2">
            {([
              ['WHATSAPP', 'WhatsApp'],
              ['EMAIL', 'Correo electrónico'],
              ['VENDEDOR', 'Muestra a vendedor(a)'],
            ] as const).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setMedioMuestra(medioMuestra === valor ? '' : valor)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                            active:scale-95 ${
                              medioMuestra === valor
                                ? 'bg-marca-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                            }`}
              >
                {texto}
              </button>
            ))}
          </div>

          {medioMuestra === 'WHATSAPP' && cliente && (
            <p className="mt-2 text-xs text-slate-500">Se enviará al {cliente.telefono}</p>
          )}

          {medioMuestra === 'VENDEDOR' && (
            <p className="mt-2 text-xs text-slate-500">
              La muestra se le entrega al vendedor para que se la haga llegar al cliente.
            </p>
          )}

          {medioMuestra === 'EMAIL' && (
            <div className="mt-2">
              <input
                type="email"
                className="campo"
                value={emailMuestra}
                placeholder="correo@ejemplo.com"
                onChange={(e) => setEmailMuestra(e.target.value)}
              />
              {cliente?.email_facturacion && emailMuestra !== cliente.email_facturacion && (
                <button
                  type="button"
                  onClick={() => setEmailMuestra(cliente.email_facturacion!)}
                  className="mt-1.5 text-xs text-marca-600 hover:text-marca-700 hover:underline"
                >
                  Usar el de facturación ({cliente.email_facturacion})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Urgencia: permite fijar una fecha distinta a la calculada por plazo */}
        <div className="border-t border-slate-100 pt-3">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-red-50 px-3 py-2
                            text-sm font-medium text-red-800 ring-1 ring-red-200">
            <input
              type="checkbox"
              checked={urgente}
              onChange={(e) => {
                setUrgente(e.target.checked);
                if (!e.target.checked) {
                  setMotivoUrgencia('');
                  setFechaEntrega('');
                }
              }}
              className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-600"
            />
            <Zap className="h-4 w-4" />
            Orden urgente
          </label>

          {urgente && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Fecha de entrega acordada</label>
                <input
                  type="date"
                  className="campo"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Si la deja vacía, se usa el plazo normal de cada tipo de trabajo.
                </p>
              </div>
              <div>
                <label className="etiqueta">Motivo</label>
                <input
                  className="campo"
                  value={motivoUrgencia}
                  placeholder="Ej. El cliente lo necesita para un evento"
                  onChange={(e) => setMotivoUrgencia(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {lineas.map((linea, indice) => (
        <LineaTrabajo
          key={linea.clave}
          linea={linea}
          indice={indice}
          catalogos={catalogos}
          puedeEliminar={lineas.length > 1}
          onCambio={(cambios) => actualizarLinea(linea.clave, cambios)}
          onEliminar={() => setLineas((ls) => ls.filter((l) => l.clave !== linea.clave))}
        />
      ))}

      <button
        type="button"
        onClick={() => setLineas((ls) => [...ls, lineaVacia()])}
        className="boton-secundario w-full border-2 border-dashed border-slate-300 bg-transparent
                   py-3 ring-0 hover:border-marca-400 hover:bg-marca-50 hover:text-marca-700"
      >
        <Plus className="h-4 w-4" />
        Agregar otro tipo de trabajo
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <button
          type="submit"
          disabled={crear.isPending || !cliente || !vendedorId}
          className="boton-primario w-full py-3"
        >
          {crear.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {crear.isPending ? 'Guardando...' : 'Registrar orden'}
        </button>
      </div>
    </form>
  );
}