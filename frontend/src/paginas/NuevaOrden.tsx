import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, LoaderCircle, CircleCheck, Printer, Zap, TriangleAlert } from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';
import { useSesion } from '../lib/sesion';
import BuscadorCliente, { type Cliente } from '../componentes/BuscadorCliente';
import LineaTrabajo, { lineaVacia, rolDeCopia, type DatosLinea } from '../componentes/LineaTrabajo';
import { nuevoId } from '../lib/id';

/**
 * Un mismo formulario sirve para tres cosas:
 *   /ordenes/nueva              ingresar una orden en blanco
 *   /ordenes/nueva?desde=123     copiar la 123 (talonarios siguen la numeración)
 *   /ordenes/123/editar          editar la 123
 * Al editar no se toca el vendedor ni se agregan o quitan trabajos.
 */
export default function NuevaOrden() {
  const navegar = useNavigate();
  const cliente0 = useQueryClient();
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const desde = parametros.get('desde');

  const editando = !!id;
  const plantillaId = id ?? desde;

  const { data: catalogos, isLoading } = useCatalogos();
  const { puede } = useSesion();
  const verPrecio = puede('ordenes.ver_precio');
  const puedeSubirMuestra = puede('archivos.subir');

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendedorId, setVendedorId] = useState<number | ''>('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [medioMuestra, setMedioMuestra] = useState<'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | ''>('');
  const [emailMuestra, setEmailMuestra] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [motivoUrgencia, setMotivoUrgencia] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [lineas, setLineas] = useState<DatosLinea[]>([lineaVacia()]);
  const [cargada, setCargada] = useState(false);
  const [error, setError] = useState('');
  const [avisoMuestras, setAvisoMuestras] = useState('');
  const [creada, setCreada] = useState<{
    id: number;
    numero_orden: number;
    fecha_entrega: string;
  } | null>(null);

  // ---------- Orden de la que se parte, al copiar o al editar ----------
  const { data: plantilla, isLoading: cargandoPlantilla } = useQuery({
    queryKey: ['plantilla', plantillaId, editando],
    queryFn: async () =>
      (
        await api.get(`/ordenes/${plantillaId}/plantilla`, {
          params: editando ? {} : { siguienteNumeracion: true },
        })
      ).data,
    enabled: !!plantillaId,
  });

  useEffect(() => {
    if (!plantilla || cargada) return;
    setCliente(plantilla.cliente);
    // Al copiar, el vendedor solo se arrastra si todavía está en la lista;
    // si no, el desplegable diría "Seleccione" con un vendedor puesto por
    // debajo. Al editar no se toca, así que da igual.
    setVendedorId(
      editando || catalogos?.vendedores.some((v) => v.id === plantilla.vendedorId)
        ? plantilla.vendedorId
        : ''
    );
    setFechaIngreso(plantilla.fechaIngreso?.slice(0, 10) ?? '');
    setObservaciones(plantilla.observaciones ?? '');
    setMedioMuestra(plantilla.medioMuestra ?? '');
    setEmailMuestra(plantilla.emailMuestra ?? '');
    setUrgente(plantilla.urgente);
    setMotivoUrgencia(plantilla.motivoUrgencia ?? '');
    setFechaEntrega(editando ? (plantilla.fechaEntrega?.slice(0, 10) ?? '') : '');
    setLineas(
      plantilla.lineas.map((l: any) => ({
        ...lineaVacia(),
        ...l,
        clave: nuevoId(),
        // Al copiar, los trabajos son nuevos: no arrastran el id ni la etapa.
        lineaId: editando ? l.lineaId : undefined,
        avanzada: editando ? l.avanzada : false,
        etapa: editando ? l.etapa : null,
        muestra: null,
        muestraVista: undefined,
        // Al pedir de nuevo, el trabajo arranca con la muestra que ya tenía;
        // al editar, la muestra ya está pegada al trabajo y no se vuelve a tocar.
        muestraArchivoId: editando ? null : (l.muestraArchivoId ?? null),
        muestraArchivoNombre: editando
          ? undefined
          : l.muestraArchivoId
            ? `${l.nombreTrabajo} · orden #${plantilla.numeroOrden}`
            : undefined,
      }))
    );
    setCargada(true);
  }, [plantilla, cargada, editando]);

  const totalOrden = lineas.reduce((s, l) => s + (Number(l.precio) || 0), 0);
  const hayAvanzadas = editando && lineas.some((l) => l.avanzada);

  function actualizarLinea(clave: string, cambios: Partial<DatosLinea>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  function limpiar() {
    setCreada(null);
    setAvisoMuestras('');
    setCliente(null);
    setVendedorId('');
    setFechaIngreso('');
    setObservaciones('');
    setMedioMuestra('');
    setEmailMuestra('');
    setUrgente(false);
    setMotivoUrgencia('');
    setFechaEntrega('');
    setLineas([lineaVacia()]);
  }

  /** Arma una línea con el nombre de campo que espera el servidor. */
  function cuerpoDeLinea(l: DatosLinea) {
    const tipo = catalogos!.tiposTrabajo.find((t) => t.id === l.tipoTrabajoId);
    const codigo = tipo?.codigo;

    const base = {
      ...(l.lineaId ? { lineaId: l.lineaId } : {}),
      tipoTrabajoId: Number(l.tipoTrabajoId),
      nombreTrabajo: l.nombreTrabajo.trim(),
      cantidad: Number(l.cantidad) || 1,
      precio: l.precio === '' ? null : Number(l.precio),
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
            numeracionInicial: l.numeracionInicial === '' ? null : Number(l.numeracionInicial),
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
          textil: { telaId: Number(l.telaId), perfilImpresion: l.perfilImpresion.trim() || null },
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
  }

  function cabecera() {
    return {
      medioMuestra: medioMuestra || null,
      emailMuestra: medioMuestra === 'EMAIL' ? emailMuestra.trim() || null : null,
      urgente,
      motivoUrgencia: urgente ? motivoUrgencia.trim() || null : null,
      fechaEntrega: urgente && fechaEntrega ? fechaEntrega : null,
      observaciones: observaciones.trim() || null,
    };
  }

  /**
   * Deja la muestra en cada trabajo recién creado: la del banco se engancha
   * sin volver a subir nada, la nueva se sube desde la computadora.
   */
  async function guardarMuestras(lineasCreadas: Array<{ id: number }>) {
    const fallos: string[] = [];
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const destino = lineasCreadas[i];
      if (!destino || (!l.muestra && !l.muestraArchivoId)) continue;
      try {
        if (l.muestraArchivoId) {
          await api.post(`/lineas/${destino.id}/archivos/copiar`, {
            archivoId: l.muestraArchivoId,
          });
        } else {
          const datos = new FormData();
          datos.append('imagen', l.muestra!);
          await api.post(`/lineas/${destino.id}/archivos`, datos);
        }
      } catch (e) {
        fallos.push(`${l.nombreTrabajo || `Trabajo ${i + 1}`}: ${mensajeDeError(e)}`);
      }
    }
    return fallos;
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (!cliente) throw new Error('Debe seleccionar un cliente');

      if (editando) {
        const cuerpo = {
          ...cabecera(),
          fechaIngreso: fechaIngreso || null,
          lineas: lineas.map(cuerpoDeLinea),
        };
        await api.put(`/ordenes/${id}/completa`, cuerpo);
        return null;
      }

      if (!vendedorId) throw new Error('Debe seleccionar un vendedor');
      const cuerpo = {
        ...cabecera(),
        clienteId: cliente.id,
        vendedorId: Number(vendedorId),
        lineas: lineas.map(cuerpoDeLinea),
      };
      const creadaAhora = (await api.post('/ordenes', cuerpo)).data;
      const fallos = await guardarMuestras(creadaAhora.lineas ?? []);
      return { ...creadaAhora, fallos };
    },
    onSuccess: (data: any) => {
      cliente0.invalidateQueries({ queryKey: ['ordenes'] });
      if (editando) {
        // Sin filtrar por id: la orden se guarda con clave de número o de id,
        // y el registro de cambios cuelga de la misma raíz.
        cliente0.invalidateQueries({ queryKey: ['orden'] });
        navegar(`/ordenes/${id}`);
        return;
      }
      if (data?.fallos?.length) {
        setAvisoMuestras(
          `La orden quedó registrada, pero la muestra no se pudo subir: ${data.fallos.join('; ')}`
        );
      }
      setCreada(data);
    },
    onError: (e) =>
      setError(e instanceof Error && !('response' in e) ? e.message : mensajeDeError(e)),
  });

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError('');
    if (hayAvanzadas) {
      const avanzadas = lineas.filter((l) => l.avanzada).map((l, i) => l.nombreTrabajo || `#${i + 1}`);
      if (
        !confirm(
          `Hay trabajos que ya van avanzados (${avanzadas.join(', ')}). ` +
            'Puede que ya se hayan impreso o que el diseñador los esté trabajando. ¿Guardar los cambios?'
        )
      )
        return;
    }
    guardar.mutate();
  }

  if (isLoading || !catalogos || (plantillaId && cargandoPlantilla)) {
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

          {avisoMuestras && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 ring-1 ring-amber-200">
              {avisoMuestras} Puede subirla desde el detalle de la orden.
            </p>
          )}

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
        <h1 className="text-xl font-semibold text-slate-900">
          {editando ? `Editar orden #${plantilla?.numeroOrden ?? ''}` : 'Nueva orden'}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {editando
            ? 'Se puede cambiar todo menos el cliente, el vendedor y el tipo de cada trabajo.'
            : desde
              ? `Copia de la orden #${plantilla?.numeroOrden ?? ''}. Revise los datos antes de guardar.`
              : 'El número de orden se asigna automáticamente al guardar.'}
        </p>
      </div>

      {hayAvanzadas && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Hay trabajos que ya pasaron de etapa o que alguien ya tomó. Si cambia sus datos, puede
          que lo que ya se imprimió no coincida con la orden.
        </p>
      )}

      {editando ? (
        // El cliente de una orden ya registrada no se cambia.
        <div className="tarjeta">
          <label className="etiqueta">Cliente</label>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <p className="font-medium text-slate-900">{cliente?.nombre ?? '—'}</p>
            <p className="text-xs text-slate-500">
              {cliente?.cedula}
              {cliente?.telefono ? ` · Tel. ${cliente.telefono}` : ''}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            El cliente queda como se registró la orden.
          </p>
        </div>
      ) : (
        <BuscadorCliente cliente={cliente} onCambio={setCliente} />
      )}

      <div className="tarjeta space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta">
              Vendedor <span className="text-red-500">*</span>
            </label>
            {editando ? (
              <>
                <div className="campo bg-slate-100 text-slate-600">
                  {plantilla?.vendedor ??
                    catalogos.vendedores.find((v) => v.id === vendedorId)?.nombre ??
                    '—'}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  El vendedor queda como se registró la orden.
                </p>
              </>
            ) : (
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
            )}
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

        {editando && (
          <div className="sm:w-1/2">
            <label className="etiqueta">Fecha de ingreso</label>
            <input
              type="date"
              className="campo"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Cambiarla no recalcula la fecha de entrega.
            </p>
          </div>
        )}

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
          puedeEliminar={!editando && lineas.length > 1}
          verPrecio={verPrecio}
          editando={editando}
          puedeSubirMuestra={puedeSubirMuestra}
          clienteId={cliente?.id ?? null}
          onCambio={(cambios) => actualizarLinea(linea.clave, cambios)}
          onEliminar={() => setLineas((ls) => ls.filter((l) => l.clave !== linea.clave))}
        />
      ))}

      {verPrecio && totalOrden > 0 && (
        <div className="tarjeta flex items-baseline justify-between py-3">
          <span className="text-sm font-medium text-slate-600">Total de la orden</span>
          <span className="text-lg font-semibold text-slate-900">
            ₡{totalOrden.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {!editando && (
        <button
          type="button"
          onClick={() => setLineas((ls) => [...ls, lineaVacia()])}
          className="boton-secundario w-full border-2 border-dashed border-slate-300 bg-transparent
                     py-3 ring-0 hover:border-marca-400 hover:bg-marca-50 hover:text-marca-700"
        >
          <Plus className="h-4 w-4" />
          Agregar otro tipo de trabajo
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        {editando && (
          <button
            type="button"
            onClick={() => navegar(`/ordenes/${id}`)}
            className="boton-secundario py-3"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={guardar.isPending || !cliente || (!editando && !vendedorId)}
          className="boton-primario flex-1 py-3"
        >
          {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {guardar.isPending
            ? 'Guardando...'
            : editando
              ? 'Guardar cambios'
              : 'Registrar orden'}
        </button>
      </div>
    </form>
  );
}
