import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, RadioTower, Plus, Pencil, Trash2, X, LoaderCircle, CircleCheck,
  TriangleAlert, Clock, History, RotateCcw, Receipt,
} from 'lucide-react';
import { api, mensajeDeError } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { fecha, fechaHora } from '../lib/formato';

type Empresa = 'IMPRENTA' | 'RADIO';
type Frecuencia = 'MENSUAL' | 'QUINCENAL';
type Estado = 'AL_DIA' | 'PENDIENTE' | 'ATRASADO';

interface PagoFijo {
  id: number;
  empresa: Empresa;
  descripcion: string;
  frecuencia: Frecuencia;
  dia_1: number;
  dia_2: number | null;
  notas: string | null;
  activo: boolean;
  desde: string;
  creado_por: string;
  pagos_anotados: number;
  periodo: string;
  estado: Estado;
  atrasados: number;
  diasDeAtraso: number;
}

interface Comprobante {
  id: number;
  periodo: string;
  pagado_en: string;
  comprobante: string;
  nota: string | null;
  creado_en: string;
  registrado_por: string;
}

const EMPRESAS: Array<[Empresa, string, typeof Printer]> = [
  ['IMPRENTA', 'Imprenta', Printer],
  ['RADIO', 'Radio', RadioTower],
];

const ESTADO: Record<Estado, { texto: string; clase: string; icono: typeof Clock }> = {
  AL_DIA: { texto: 'Al día', clase: 'bg-emerald-100 text-emerald-700', icono: CircleCheck },
  PENDIENTE: { texto: 'Por pagar', clase: 'bg-amber-100 text-amber-700', icono: Clock },
  ATRASADO: { texto: 'Atrasado', clase: 'bg-red-100 text-red-700', icono: TriangleAlert },
};

/** "Cada mes el 15" o "Cada quincena, los días 15 y 30". */
function comoSePaga(p: { frecuencia: Frecuencia; dia_1: number; dia_2: number | null }) {
  return p.frecuencia === 'MENSUAL'
    ? `Cada mes el ${p.dia_1}`
    : `Cada quincena, los días ${p.dia_1} y ${p.dia_2}`;
}

export default function ControlPagos() {
  const cliente = useQueryClient();
  const { puede } = useSesion();
  const [empresa, setEmpresa] = useState<Empresa>('IMPRENTA');
  const [editando, setEditando] = useState<PagoFijo | 'nuevo' | null>(null);
  const [cobrando, setCobrando] = useState<PagoFijo | null>(null);
  const [viendo, setViendo] = useState<PagoFijo | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);

  // El apartado es solo de administración. El servidor igual lo bloquea;
  // esto es para que a los demás no les quede la pantalla en blanco.
  const esDeAdministracion = puede('pagos_fijos.gestionar');

  const { data, isLoading } = useQuery({
    enabled: esDeAdministracion,
    queryKey: ['control-pagos', empresa, verInactivos],
    queryFn: async () =>
      (await api.get<{ empresa: Empresa; hoy: string; pagos: PagoFijo[] }>(
        `/control-pagos?empresa=${empresa}${verInactivos ? '&inactivos=true' : ''}`
      )).data,
  });

  const refrescar = () => cliente.invalidateQueries({ queryKey: ['control-pagos'] });

  const quitar = useMutation({
    mutationFn: (id: number) => api.delete(`/control-pagos/${id}`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const reactivar = useMutation({
    mutationFn: (id: number) => api.post(`/control-pagos/${id}/reactivar`),
    onSuccess: refrescar,
    onError: (e) => alert(mensajeDeError(e)),
  });

  const pagos = data?.pagos ?? [];
  // Un pago inactivo ya no se cobra, así que no cuenta como atrasado.
  const atrasados = pagos.filter((p) => p.activo && p.estado === 'ATRASADO').length;

  if (!esDeAdministracion) {
    return (
      <div className="tarjeta grid place-items-center py-16 text-center">
        <Receipt className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-700">Este apartado es de administración</p>
        <p className="mt-1 text-sm text-slate-500">
          El control de pagos lo manejan la Administración y la Gerencia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Control de pagos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Los pagos que se repiten todos los meses o cada quincena
          </p>
        </div>
        <button onClick={() => setEditando('nuevo')} className="boton-primario">
          <Plus className="h-4 w-4" />
          Agregar pago
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {EMPRESAS.map(([codigo, texto, Icono]) => (
          <button
            key={codigo}
            onClick={() => setEmpresa(codigo)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium
                        transition-colors ${
                          empresa === codigo
                            ? 'border-marca-600 text-marca-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
          >
            <Icono className="h-4 w-4" />
            {texto}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 px-2 py-2.5 text-xs
                          text-slate-500">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Ver los inactivos
        </label>
      </div>

      {atrasados > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800
                      ring-1 ring-red-200">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {atrasados === 1
            ? 'Hay un pago atrasado sin comprobante.'
            : `Hay ${atrasados} pagos atrasados sin comprobante.`}
        </p>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-marca-600" />
        </div>
      ) : pagos.length === 0 ? (
        <div className="tarjeta grid place-items-center py-16 text-center">
          <Receipt className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">
            Todavía no hay pagos anotados para {empresa === 'IMPRENTA' ? 'la Imprenta' : 'la Radio'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Agregue el alquiler, los servicios y lo demás que se paga cada mes o cada quincena.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagos.map((p) => {
            const estado = ESTADO[p.estado];
            const Icono = estado.icono;
            return (
              <div
                key={p.id}
                className={`tarjeta ${p.activo ? '' : 'opacity-60'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                      {p.descripcion}
                      {p.activo && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5
                                          text-[11px] font-semibold ${estado.clase}`}>
                          <Icono className="h-3 w-3" />
                          {estado.texto}
                        </span>
                      )}
                      {!p.activo && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px]
                                         font-semibold text-slate-600">
                          Inactivo
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{comoSePaga(p)}</p>
                    {p.activo ? (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {p.estado === 'AL_DIA' ? 'Próximo pago: ' : 'Toca pagar: '}
                        <strong className="text-slate-900">{fecha(p.periodo)}</strong>
                        {p.estado === 'ATRASADO' && (
                          <span className="text-red-700">
                            {' '}· {p.diasDeAtraso === 1
                              ? 'un día de atraso'
                              : `${p.diasDeAtraso} días de atraso`}
                          </span>
                        )}
                        {p.atrasados > 1 && (
                          <span className="text-red-700"> · {p.atrasados} sin comprobante</span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-slate-500">
                        Ya no se está controlando. El historial se conserva.
                      </p>
                    )}
                    {p.notas && <p className="mt-1 text-xs text-slate-500">{p.notas}</p>}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!p.activo && (
                      <button
                        onClick={() => reactivar.mutate(p.id)}
                        className="boton-secundario py-1.5 px-3 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reactivar
                      </button>
                    )}
                    {p.activo && (
                      <button
                        onClick={() => setCobrando(p)}
                        className={`boton-primario py-1.5 px-3 text-xs ${
                          p.estado === 'AL_DIA' ? 'bg-slate-600 hover:bg-slate-700' : ''
                        }`}
                      >
                        <CircleCheck className="h-3.5 w-3.5" />
                        Ya pagó
                      </button>
                    )}
                    <button
                      onClick={() => setViendo(p)}
                      title="Ver los comprobantes anotados"
                      className="boton-secundario py-1.5 px-3 text-xs"
                    >
                      <History className="h-3.5 w-3.5" />
                      {p.pagos_anotados}
                    </button>
                    <button
                      onClick={() => setEditando(p)}
                      title="Editar"
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400
                                 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const aviso = p.pagos_anotados
                          ? `"${p.descripcion}" ya tiene ${p.pagos_anotados} comprobante(s) anotados, así que se va a desactivar para no perder el historial. ¿Seguimos?`
                          : `¿Quitar "${p.descripcion}"?`;
                        if (confirm(aviso)) quitar.mutate(p.id);
                      }}
                      title="Quitar"
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400
                                 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <ModalPago
          empresa={empresa}
          pago={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); refrescar(); }}
        />
      )}

      {cobrando && (
        <ModalComprobante
          pago={cobrando}
          onCerrar={() => setCobrando(null)}
          onGuardado={() => { setCobrando(null); refrescar(); }}
        />
      )}

      {viendo && (
        <ModalHistorial
          pago={viendo}
          onCerrar={() => setViendo(null)}
          onCambio={refrescar}
        />
      )}
    </div>
  );
}

// ------------------------------------------------- Agregar o editar un pago

function ModalPago({
  empresa, pago, onCerrar, onGuardado,
}: {
  empresa: Empresa;
  pago: PagoFijo | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [descripcion, setDescripcion] = useState(pago?.descripcion ?? '');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(pago?.frecuencia ?? 'MENSUAL');
  const [dia1, setDia1] = useState<number | ''>(pago?.dia_1 ?? '');
  const [dia2, setDia2] = useState<number | ''>(pago?.dia_2 ?? '');
  const [notas, setNotas] = useState(pago?.notas ?? '');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: async (): Promise<void> => {
      const cuerpo = {
        empresa: pago?.empresa ?? empresa,
        descripcion: descripcion.trim(),
        frecuencia,
        dia1: Number(dia1),
        dia2: frecuencia === 'QUINCENAL' ? Number(dia2) : null,
        notas: notas.trim() || null,
        ...(pago ? { desde: pago.desde } : {}),
      };
      if (pago) await api.put(`/control-pagos/${pago.id}`, cuerpo);
      else await api.post('/control-pagos', cuerpo);
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  const listo =
    descripcion.trim().length >= 3 &&
    Number(dia1) >= 1 && Number(dia1) <= 31 &&
    (frecuencia === 'MENSUAL' || (Number(dia2) >= 1 && Number(dia2) <= 31 && dia2 !== dia1));

  return (
    <Ventana
      titulo={pago ? 'Editar pago' : `Nuevo pago de ${empresa === 'IMPRENTA' ? 'la Imprenta' : 'la Radio'}`}
      onCerrar={onCerrar}
    >
      <div className="space-y-3">
        <div>
          <label className="etiqueta">
            Descripción <span className="text-red-500">*</span>
          </label>
          <input
            className="campo"
            value={descripcion}
            autoFocus
            placeholder="Ej. Alquiler del local"
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div>
          <label className="etiqueta">
            ¿Cada cuánto se paga? <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(['MENSUAL', 'QUINCENAL'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setFrecuencia(f); if (f === 'MENSUAL') setDia2(''); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all
                            duration-150 active:scale-95 ${
                              frecuencia === f
                                ? 'bg-marca-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                            }`}
              >
                {f === 'MENSUAL' ? 'Mensual' : 'Quincenal'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta">
              {frecuencia === 'MENSUAL' ? 'Día del mes' : 'Primer día'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={31}
              className="campo"
              value={dia1}
              placeholder="15"
              onChange={(e) => setDia1(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          {frecuencia === 'QUINCENAL' && (
            <div>
              <label className="etiqueta">
                Segundo día <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={31}
                className="campo"
                value={dia2}
                placeholder="30"
                onChange={(e) => setDia2(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Si el mes no llega a ese día —un 31 en febrero— el vencimiento se corre al último día.
        </p>

        <div>
          <label className="etiqueta">Notas</label>
          <input
            className="campo"
            value={notas}
            placeholder="Ej. Se paga por transferencia al BN"
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !listo}
            className="boton-primario flex-1"
          >
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
      </div>
    </Ventana>
  );
}

// ------------------------------------------------------- "Ya pagó"

function ModalComprobante({
  pago, onCerrar, onGuardado,
}: {
  pago: PagoFijo;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [comprobante, setComprobante] = useState('');
  const [pagadoEn, setPagadoEn] = useState(pago.periodo);
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const guardar = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post(`/control-pagos/${pago.id}/pagos`, {
        periodo: pago.periodo,
        pagadoEn,
        comprobante: comprobante.trim(),
        nota: nota.trim() || null,
      });
    },
    onSuccess: onGuardado,
    onError: (e) => setError(mensajeDeError(e)),
  });

  return (
    <Ventana titulo="Anotar el pago" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <p className="font-medium text-slate-900">{pago.descripcion}</p>
          <p className="text-sm text-slate-500">
            Vencimiento del <strong className="text-slate-700">{fecha(pago.periodo)}</strong>
            {pago.estado === 'AL_DIA' && ' · se está pagando por adelantado'}
          </p>
        </div>

        <div>
          <label className="etiqueta">
            N° de comprobante <span className="text-red-500">*</span>
          </label>
          <input
            className="campo"
            value={comprobante}
            autoFocus
            placeholder="Ej. 00123456"
            onChange={(e) => setComprobante(e.target.value)}
          />
        </div>

        <div>
          <label className="etiqueta">Fecha en que se pagó</label>
          <input
            type="date"
            className="campo"
            value={pagadoEn}
            onChange={(e) => setPagadoEn(e.target.value)}
          />
        </div>

        <div>
          <label className="etiqueta">Nota</label>
          <input
            className="campo"
            value={nota}
            placeholder="Ej. Transferencia desde la cuenta de la Radio"
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !comprobante.trim() || !pagadoEn}
            className="boton-primario flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {guardar.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Guardar el comprobante
          </button>
          <button onClick={onCerrar} className="boton-secundario">Cancelar</button>
        </div>
        {!comprobante.trim() && (
          <p className="text-xs text-slate-500">Falta el número de comprobante.</p>
        )}
      </div>
    </Ventana>
  );
}

// ----------------------------------------------------- Los comprobantes

function ModalHistorial({
  pago, onCerrar, onCambio,
}: {
  pago: PagoFijo;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const cliente = useQueryClient();
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['control-pagos', 'historial', pago.id],
    queryFn: async () =>
      (await api.get<Comprobante[]>(`/control-pagos/${pago.id}/historial`)).data,
  });

  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`/control-pagos/pagos/${id}`),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['control-pagos', 'historial', pago.id] });
      onCambio();
    },
    onError: (e) => alert(mensajeDeError(e)),
  });

  return (
    <Ventana titulo={`Comprobantes de ${pago.descripcion}`} onCerrar={onCerrar} ancha>
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <LoaderCircle className="h-5 w-5 animate-spin text-marca-600" />
        </div>
      ) : registros.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Todavía no se le ha anotado ningún pago.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {registros.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  Vencimiento {fecha(r.periodo)} · comprobante{' '}
                  <span className="font-mono">{r.comprobante}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Pagado el {fecha(r.pagado_en)} · anotado por {r.registrado_por} el{' '}
                  {fechaHora(r.creado_en)}
                </p>
                {r.nota && <p className="text-xs text-slate-500">{r.nota}</p>}
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Quitar el comprobante ${r.comprobante}? El vencimiento del ${fecha(r.periodo)} vuelve a quedar pendiente.`))
                    borrar.mutate(r.id);
                }}
                title="Quitar este comprobante"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400
                           transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Ventana>
  );
}

// ------------------------------------------------------------- La ventana

function Ventana({
  titulo, ancha, onCerrar, children,
}: {
  titulo: string;
  ancha?: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/40 p-4">
      <div className={`w-full ${ancha ? 'max-w-lg' : 'max-w-sm'} rounded-xl bg-white p-5 shadow-xl`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onCerrar} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
