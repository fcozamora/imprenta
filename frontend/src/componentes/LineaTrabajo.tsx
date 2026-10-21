import { useRef, useState } from 'react';
import { ImagePlus, Images, Trash2, X } from 'lucide-react';
import type { Catalogos } from '../lib/consultas';
import { nuevoId } from '../lib/id';
import BancoMuestras, { useMuestrasDelCliente } from './BancoMuestras';
import ImagenProtegida from './ImagenProtegida';
import VisorImagen from './VisorImagen';
import { useZonaArrastre } from '../lib/arrastre';

/**
 * Papeles disponibles según la posición de la hoja:
 * - Talonario sencillo: cualquier papel, no hay copiado.
 * - Original de un talonario con copias: el marcado como original en el catálogo.
 * - Intermedias y final: solo químicos.
 */
function papelesDeCopia(papeles: Catalogos['papeles'], rol: string, totalCopias: number) {
  if (totalCopias === 1) return papeles;
  if (rol === 'ORIGINAL') return papeles.filter((p) => p.es_original === 1);
  return papeles.filter((p) => p.categoria === 'QUIMICO');
}

export interface DatosLinea {
  clave: string;
  /** Solo al editar: el trabajo que ya existe en la base. */
  lineaId?: number;
  /** Solo al editar: ya lo tomó alguien o pasó de etapa. */
  avanzada?: boolean;
  etapa?: string | null;
  /** Foto de la muestra escogida al crear la orden, todavía sin subir. */
  muestra?: File | null;
  muestraVista?: string;
  /** Muestra tomada del banco del cliente, que se engancha al guardar. */
  muestraArchivoId?: number | null;
  muestraArchivoNombre?: string;
  tipoTrabajoId: number | '';
  nombreTrabajo: string;
  cantidad: number | '';
  precio: number | '';
  archivoSinCambios: boolean;
  observaciones: string;
  // Talonarios
  cantidadBlocks: number | '';
  hojasPorBlock: number | '';
  tamanoId: number | '';
  tamanoOtro: string;
  tipoCopiaId: number | '';
  tinta: string;
  encolado: boolean;
  perforado: boolean;
  grapado: boolean;
  carbon: boolean;
  numeracionInicial: number | '';
  papeles: number[];
  // Otras categorías
  tipoSobreId: number | '';
  tamano: string;
  materialId: number | '';
  telaId: number | '';
  perfilImpresion: string;
  codigoSello: string;
  tintaId: number | '';
}

export function lineaVacia(): DatosLinea {
  return {
    clave: nuevoId(), muestra: null, muestraArchivoId: null,
    tipoTrabajoId: '', nombreTrabajo: '', cantidad: '', precio: '', archivoSinCambios: false,
    observaciones: '', cantidadBlocks: '', hojasPorBlock: '', tamanoId: '', tamanoOtro: '',
    tipoCopiaId: '', tinta: '', encolado: false, perforado: false, grapado: false, carbon: false,
    numeracionInicial: '', papeles: [], tipoSobreId: '', tamano: '', materialId: '',
    telaId: '', perfilImpresion: '', codigoSello: '', tintaId: '',
  };
}

/** NF = NI + (blocks x hojas) - 1 */
export function numeracionFinal(l: DatosLinea): number | null {
  const ni = Number(l.numeracionInicial);
  const blocks = Number(l.cantidadBlocks);
  const hojas = Number(l.hojasPorBlock);
  if (!ni || !blocks || !hojas) return null;
  return ni + blocks * hojas - 1;
}

/** La última copia es la Final; las del medio, Intermedias. */
export function rolDeCopia(posicion: number, total: number): 'ORIGINAL' | 'INTERMEDIO' | 'FINAL' {
  if (posicion === 1) return 'ORIGINAL';
  return posicion === total ? 'FINAL' : 'INTERMEDIO';
}

interface Props {
  linea: DatosLinea;
  indice: number;
  catalogos: Catalogos;
  puedeEliminar: boolean;
  verPrecio?: boolean;
  /** Al editar no se cambia el tipo de trabajo ni se adjunta la muestra aquí. */
  editando?: boolean;
  puedeSubirMuestra?: boolean;
  /** Cliente de la orden, para ofrecerle su banco de muestras. */
  clienteId?: number | null;
  onCambio: (cambios: Partial<DatosLinea>) => void;
  onEliminar: () => void;
}

export default function LineaTrabajo({
  linea, indice, catalogos, puedeEliminar, verPrecio = false,
  editando = false, puedeSubirMuestra = false, clienteId = null, onCambio, onEliminar,
}: Props) {
  const entradaMuestra = useRef<HTMLInputElement>(null);
  const [abrirBanco, setAbrirBanco] = useState(false);
  const [ampliada, setAmpliada] = useState<{ url: string; nombre?: string } | null>(null);
  const [errorMuestra, setErrorMuestra] = useState('');
  const { data: muestrasDelCliente = [] } = useMuestrasDelCliente(
    !editando && puedeSubirMuestra ? clienteId : null
  );
  const tipo = catalogos.tiposTrabajo.find((t) => t.id === linea.tipoTrabajoId);
  const codigo = tipo?.codigo;

  function escogerMuestra(archivo: File | null) {
    if (linea.muestraVista) URL.revokeObjectURL(linea.muestraVista);
    setErrorMuestra('');
    onCambio({
      muestra: archivo,
      muestraVista: archivo ? URL.createObjectURL(archivo) : undefined,
      muestraArchivoId: null,
      muestraArchivoNombre: undefined,
    });
  }

  // Se puede soltar la foto encima del recuadro.
  const arrastre = useZonaArrastre(escogerMuestra, setErrorMuestra);

  function quitarMuestra() {
    if (linea.muestraVista) URL.revokeObjectURL(linea.muestraVista);
    if (entradaMuestra.current) entradaMuestra.current.value = '';
    onCambio({
      muestra: null,
      muestraVista: undefined,
      muestraArchivoId: null,
      muestraArchivoNombre: undefined,
    });
  }

  const copias = catalogos.tiposCopia.find((c) => c.id === linea.tipoCopiaId)?.cantidad_hojas ?? 0;
  const nf = numeracionFinal(linea);

  function cambiarTipoCopia(id: number) {
    const total = catalogos.tiposCopia.find((c) => c.id === id)?.cantidad_hojas ?? 0;
    const papeles = Array(total).fill(0);
    // Con copias, el original queda fijo y preseleccionado.
    if (total > 1) {
      const original = catalogos.papeles.find((p) => p.es_original === 1);
      if (original) papeles[0] = original.id;
    }
    onCambio({ tipoCopiaId: id, papeles });
  }

  function cambiarPapel(posicion: number, papelId: number) {
    const papeles = [...linea.papeles];
    papeles[posicion - 1] = papelId;
    onCambio({ papeles });
  }

  return (
    <div className="tarjeta space-y-4 border-l-4 border-l-marca-500">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          Trabajo {indice + 1}
          {editando && linea.etapa && (
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {linea.etapa}
            </span>
          )}
        </h3>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400
                       transition-colors hover:bg-red-50 hover:text-red-600"
            title="Quitar este trabajo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ---------- Tipo de trabajo ---------- */}
      <div>
        <label className="etiqueta">Tipo de trabajo <span className="text-red-500">*</span></label>
        {editando ? (
          // El tipo decide en qué tabla vive el detalle y qué etapas lleva:
          // cambiarlo a mitad de camino dejaría el trabajo sin su historial.
          <>
            <div className="campo w-fit bg-slate-100 font-medium text-slate-700">
              {tipo?.nombre ?? 'Sin definir'}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              El tipo de trabajo no se cambia. Si está equivocado, anule la orden e ingrésela
              de nuevo.
            </p>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {catalogos.tiposTrabajo.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onCambio({ tipoTrabajoId: t.id })}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                            active:scale-95 ${
                              linea.tipoTrabajoId === t.id
                                ? 'bg-marca-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                            }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}
        {tipo && !editando && (
          <p className="mt-1.5 text-xs text-slate-500">
            Plazo de entrega: {tipo.dias_habiles_entrega} días hábiles
          </p>
        )}
      </div>

      {codigo && (
        <>
          {/* ---------- Campos comunes ---------- */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="etiqueta">Nombre del trabajo <span className="text-red-500">*</span></label>
              <input
                className="campo"
                value={linea.nombreTrabajo}
                onChange={(e) => onCambio({ nombreTrabajo: e.target.value })}
                placeholder="Ej. Factura timbrada"
              />
            </div>
            <div>
              <label className="etiqueta">
                {codigo === 'TALONARIOS' ? 'Cantidad de blocks' : 'Cantidad'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="campo"
                value={codigo === 'TALONARIOS' ? linea.cantidadBlocks : linea.cantidad}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  onCambio(codigo === 'TALONARIOS' ? { cantidadBlocks: v, cantidad: v } : { cantidad: v });
                }}
              />
            </div>
          </div>

          {verPrecio && (
            <div className="sm:w-1/2">
              <label className="etiqueta">Precio</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ₡
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="campo pl-7"
                  value={linea.precio}
                  placeholder="0.00"
                  onChange={(e) =>
                    onCambio({ precio: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Sale en la orden impresa, pero solo cuando la imprime alguien que puede ver
                precios.
              </p>
            </div>
          )}

          <label
            className={`flex w-fit items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm
                        font-medium text-sky-800 ring-1 ring-sky-200 ${
                          editando && linea.avanzada ? 'opacity-60' : 'cursor-pointer'
                        }`}
            title={
              editando && linea.avanzada
                ? 'El trabajo ya avanzó de etapa: cambiar esto le movería el flujo'
                : undefined
            }
          >
            <input
              type="checkbox"
              checked={linea.archivoSinCambios}
              disabled={editando && linea.avanzada}
              onChange={(e) => onCambio({ archivoSinCambios: e.target.checked })}
              className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-600"
            />
            Archivo sin cambios
          </label>

          {/* ---------- Muestra del trabajo ---------- */}
          {!editando && puedeSubirMuestra && (
            <div
              className={`rounded-lg transition-colors ${
                arrastre.encima ? 'bg-marca-50 p-2 ring-2 ring-marca-400' : ''
              }`}
              {...arrastre.props}
            >
              <label className="etiqueta">Muestra del trabajo</label>
              <input
                ref={entradaMuestra}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => escogerMuestra(e.target.files?.[0] ?? null)}
              />
              {linea.muestraVista || linea.muestraArchivoId ? (
                <div className="flex items-start gap-3">
                  {linea.muestraArchivoId ? (
                    <ImagenProtegida
                      id={linea.muestraArchivoId}
                      alt=""
                      className="h-24 w-24 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200"
                      onAmpliar={(url) =>
                        setAmpliada({ url, nombre: linea.muestraArchivoNombre })
                      }
                    />
                  ) : (
                    <img
                      src={linea.muestraVista}
                      alt=""
                      title="Ver completa"
                      onClick={() =>
                        setAmpliada({ url: linea.muestraVista!, nombre: linea.muestra?.name })
                      }
                      className="h-24 w-24 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  )}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-600">
                      {linea.muestraArchivoId
                        ? (linea.muestraArchivoNombre ?? 'Muestra del banco del cliente')
                        : linea.muestra?.name}
                    </p>
                    {linea.muestraArchivoId && (
                      <p className="text-xs text-slate-400">
                        Tomada de las muestras del cliente
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {clienteId && (
                        <button
                          type="button"
                          onClick={() => setAbrirBanco(true)}
                          className="boton-secundario py-1.5 px-3 text-xs"
                        >
                          <Images className="h-3.5 w-3.5" />
                          Cambiar por otra del cliente
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => entradaMuestra.current?.click()}
                        className="boton-secundario py-1.5 px-3 text-xs"
                      >
                        Subir otra foto
                      </button>
                      <button
                        type="button"
                        onClick={quitarMuestra}
                        className="boton-secundario py-1.5 px-3 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {/* Lo primero es buscar en lo que el cliente ya tiene. */}
                  {clienteId && (
                    <button
                      type="button"
                      onClick={() => setAbrirBanco(true)}
                      className="boton-secundario flex-1 border-2 border-dashed border-marca-300
                                 bg-transparent py-3 text-sm text-marca-700 ring-0
                                 hover:border-marca-400 hover:bg-marca-50"
                    >
                      <Images className="h-4 w-4" />
                      Escoger de las muestras del cliente
                      {muestrasDelCliente.length > 0 && ` (${muestrasDelCliente.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => entradaMuestra.current?.click()}
                    className="boton-secundario flex-1 border-2 border-dashed border-slate-300
                               bg-transparent py-3 text-sm ring-0 hover:border-marca-400
                               hover:bg-marca-50 hover:text-marca-700"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Subir una foto nueva
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {clienteId
                  ? 'El banco tiene la última versión de cada trabajo que se le ha hecho al cliente. La foto nueva queda ahí también, para la próxima vez. También puede arrastrar la foto hasta aquí.'
                  : 'Escoja primero el cliente para ver las muestras que ya tiene. JPG o PNG, o arrastre la foto hasta aquí.'}
              </p>

              {errorMuestra && (
                <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                  {errorMuestra}
                </p>
              )}

              {ampliada && (
                <VisorImagen
                  url={ampliada.url}
                  nombre={ampliada.nombre}
                  onCerrar={() => setAmpliada(null)}
                />
              )}

              {abrirBanco && clienteId && (
                <BancoMuestras
                  clienteId={clienteId}
                  nombreTrabajo={linea.nombreTrabajo}
                  onCerrar={() => setAbrirBanco(false)}
                  onEscoger={(m) => {
                    if (linea.muestraVista) URL.revokeObjectURL(linea.muestraVista);
                    onCambio({
                      muestra: null,
                      muestraVista: undefined,
                      muestraArchivoId: m.id,
                      muestraArchivoNombre: `${m.nombre_trabajo} · orden #${m.numero_orden}`,
                    });
                    setAbrirBanco(false);
                  }}
                />
              )}
            </div>
          )}

          {/* ---------- TALONARIOS ---------- */}
          {codigo === 'TALONARIOS' && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etiqueta">Tamaño <span className="text-red-500">*</span></label>
                  <select
                    className="campo"
                    value={linea.tamanoId}
                    onChange={(e) =>
                      onCambio({
                        tamanoId: e.target.value === 'otro' ? '' : Number(e.target.value),
                        tamanoOtro: e.target.value === 'otro' ? linea.tamanoOtro : '',
                      })
                    }
                  >
                    <option value="">Seleccione</option>
                    {catalogos.tamanosTalonario.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                    <option value="otro">Otro</option>
                  </select>
                  {!linea.tamanoId && (
                    <input
                      className="campo mt-2"
                      value={linea.tamanoOtro}
                      onChange={(e) => onCambio({ tamanoOtro: e.target.value })}
                      placeholder="Escriba el tamaño"
                    />
                  )}
                </div>

                <div>
                  <label className="etiqueta">Blocks de (hojas) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    className="campo"
                    value={linea.hojasPorBlock}
                    onChange={(e) =>
                      onCambio({ hojasPorBlock: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="etiqueta">Cantidad de copias <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {catalogos.tiposCopia.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => cambiarTipoCopia(c.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                                  active:scale-95 ${
                                    linea.tipoCopiaId === c.id
                                      ? 'bg-marca-600 text-white shadow-sm'
                                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                                  }`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Papel de cada hoja: el original va fijo cuando hay copias */}
              {copias > 0 && (
                <div>
                  <label className="etiqueta">{copias === 1 ? 'Papel' : 'Color de copias'}</label>
                  <div className="space-y-2">
                    {Array.from({ length: copias }, (_, i) => i + 1).map((posicion) => {
                      const rol = rolDeCopia(posicion, copias);
                      const opciones = papelesDeCopia(catalogos.papeles, rol, copias);
                      const etiqueta =
                        copias === 1
                          ? 'Hoja'
                          : rol === 'ORIGINAL'
                            ? 'Original'
                            : rol === 'FINAL'
                              ? 'Final'
                              : `Intermedio ${posicion - 1}`;

                      if (rol === 'ORIGINAL' && copias > 1) {
                        const original = catalogos.papeles.find((p) => p.es_original === 1);
                        return (
                          <div key={posicion} className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-sm font-medium text-slate-600">
                              {etiqueta}
                            </span>
                            <div className="campo bg-slate-100 text-slate-600">
                              {original?.nombre ?? 'Sin definir'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={posicion} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-sm font-medium text-slate-600">
                            {etiqueta}
                          </span>
                          <select
                            className="campo"
                            value={linea.papeles[posicion - 1] || ''}
                            onChange={(e) => cambiarPapel(posicion, Number(e.target.value))}
                          >
                            <option value="">Seleccione el papel</option>
                            {opciones.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="etiqueta">Tinta <span className="text-red-500">*</span></label>
                <input
                  className="campo"
                  value={linea.tinta}
                  onChange={(e) => onCambio({ tinta: e.target.value })}
                  placeholder="Ej. Negro, Azul y Rojo"
                />
              </div>

              <div>
                <label className="etiqueta">Acabados</label>
                <div className="flex flex-wrap gap-4">
                  {([
                    ['encolado', 'Encolado'],
                    ['perforado', 'Perforado'],
                    ['grapado', 'Grapado'],
                    ['carbon', 'Carbón'],
                  ] as const).map(([clave, texto]) => (
                    <label key={clave} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={linea[clave]}
                        onChange={(e) => onCambio({ [clave]: e.target.checked } as Partial<DatosLinea>)}
                        className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-600"
                      />
                      {texto}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etiqueta">Numeración inicial</label>
                  <input
                    type="number"
                    min={0}
                    className="campo"
                    value={linea.numeracionInicial}
                    onChange={(e) =>
                      onCambio({ numeracionInicial: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                    placeholder="1201"
                  />
                </div>
                <div>
                  <label className="etiqueta">Numeración final</label>
                  <div className="campo bg-slate-100 font-medium text-slate-700">
                    {nf !== null ? nf.toLocaleString('es-CR') : '—'}
                  </div>
                  {nf !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      {Number(linea.cantidadBlocks)} × {Number(linea.hojasPorBlock)} ={' '}
                      {(Number(linea.cantidadBlocks) * Number(linea.hojasPorBlock)).toLocaleString('es-CR')} hojas
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- SOBRES ---------- */}
          {codigo === 'SOBRES' && (
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Tipo de sobre <span className="text-red-500">*</span></label>
                <select
                  className="campo"
                  value={linea.tipoSobreId}
                  onChange={(e) => onCambio({ tipoSobreId: Number(e.target.value) })}
                >
                  <option value="">Seleccione</option>
                  {catalogos.tiposSobre.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Tinta <span className="text-red-500">*</span></label>
                <input
                  className="campo"
                  value={linea.tinta}
                  onChange={(e) => onCambio({ tinta: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ---------- HP LATEX / IMPRESIÓN DIGITAL ---------- */}
          {(codigo === 'HP_LATEX' || codigo === 'IMPRESION_DIGITAL') && (
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Tamaño <span className="text-red-500">*</span></label>
                <input
                  className="campo"
                  value={linea.tamano}
                  onChange={(e) => onCambio({ tamano: e.target.value })}
                  placeholder="Ej. 2m x 1m"
                />
              </div>
              <div>
                <label className="etiqueta">Material <span className="text-red-500">*</span></label>
                <select
                  className="campo"
                  value={linea.materialId}
                  onChange={(e) => onCambio({ materialId: Number(e.target.value) })}
                >
                  <option value="">Seleccione</option>
                  {(codigo === 'IMPRESION_DIGITAL'
                    ? catalogos.materialesDigital
                    : catalogos.materialesLatex
                  ).map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ---------- TEXTIL ---------- */}
          {codigo === 'TEXTIL' && (
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Tipo de tela <span className="text-red-500">*</span></label>
                <select
                  className="campo"
                  value={linea.telaId}
                  onChange={(e) => onCambio({ telaId: Number(e.target.value) })}
                >
                  <option value="">Seleccione</option>
                  {catalogos.telas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Perfil de impresión</label>
                <input
                  className="campo"
                  value={linea.perfilImpresion}
                  onChange={(e) => onCambio({ perfilImpresion: e.target.value })}
                  placeholder="Se puede completar después"
                />
              </div>
            </div>
          )}

          {/* ---------- SELLOS ---------- */}
          {codigo === 'SELLOS' && (
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
              <div>
                <label className="etiqueta">Código de sello</label>
                <input
                  className="campo"
                  value={linea.codigoSello}
                  onChange={(e) => onCambio({ codigoSello: e.target.value })}
                />
              </div>
              <div>
                <label className="etiqueta">Tinta</label>
                <select
                  className="campo"
                  value={linea.tintaId}
                  onChange={(e) => onCambio({ tintaId: Number(e.target.value) })}
                >
                  <option value="">Seleccione</option>
                  {catalogos.tintas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* DTF y Bordado solo usan los campos comunes */}

          <div>
            <label className="etiqueta">Observaciones</label>
            <textarea
              rows={2}
              className="campo resize-none"
              value={linea.observaciones}
              onChange={(e) => onCambio({ observaciones: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}