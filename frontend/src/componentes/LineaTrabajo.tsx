import { Trash2 } from 'lucide-react';
import type { Catalogos } from '../lib/consultas';

/** El original de un talonario con copias siempre va en el mismo papel. */
const PAPEL_ORIGINAL = 'Químico Blanco';

/**
 * Papeles disponibles según la posición de la hoja:
 * - Talonario sencillo: cualquier papel, no hay copiado.
 * - Original de un talonario con copias: siempre el mismo.
 * - Intermedias y final: solo químicos.
 */
function papelesDeCopia(papeles: Catalogos['papeles'], rol: string, totalCopias: number) {
  if (totalCopias === 1) return papeles;
  if (rol === 'ORIGINAL') return papeles.filter((p) => p.nombre === PAPEL_ORIGINAL);
  return papeles.filter((p) => p.nombre.startsWith('Químico'));
}

export interface DatosLinea {
  clave: string;
  tipoTrabajoId: number | '';
  nombreTrabajo: string;
  cantidad: number | '';
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
    clave: crypto.randomUUID(),
    tipoTrabajoId: '', nombreTrabajo: '', cantidad: '', archivoSinCambios: false,
    observaciones: '', cantidadBlocks: '', hojasPorBlock: '', tamanoId: '', tamanoOtro: '',
    tipoCopiaId: '', tinta: '', encolado: false, perforado: false, grapado: false,
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
  onCambio: (cambios: Partial<DatosLinea>) => void;
  onEliminar: () => void;
}

export default function LineaTrabajo({
  linea, indice, catalogos, puedeEliminar, onCambio, onEliminar,
}: Props) {
  const tipo = catalogos.tiposTrabajo.find((t) => t.id === linea.tipoTrabajoId);
  const codigo = tipo?.codigo;

  const copias = catalogos.tiposCopia.find((c) => c.id === linea.tipoCopiaId)?.cantidad_hojas ?? 0;
  const nf = numeracionFinal(linea);

  function cambiarTipoCopia(id: number) {
    const total = catalogos.tiposCopia.find((c) => c.id === id)?.cantidad_hojas ?? 0;
    const papeles = Array(total).fill(0);
    // Con copias, el original queda fijo y preseleccionado.
    if (total > 1) {
      const original = catalogos.papeles.find((p) => p.nombre === PAPEL_ORIGINAL);
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
        <h3 className="font-semibold text-slate-900">Trabajo {indice + 1}</h3>
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
        {tipo && (
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

          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-sky-50 px-3 py-2
                            text-sm font-medium text-sky-800 ring-1 ring-sky-200">
            <input
              type="checkbox"
              checked={linea.archivoSinCambios}
              onChange={(e) => onCambio({ archivoSinCambios: e.target.checked })}
              className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-600"
            />
            Archivo sin cambios
          </label>

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
                        return (
                          <div key={posicion} className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-sm font-medium text-slate-600">
                              {etiqueta}
                            </span>
                            <div className="campo bg-slate-100 text-slate-600">{PAPEL_ORIGINAL}</div>
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
                  {catalogos.materialesLatex.map((m) => (
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