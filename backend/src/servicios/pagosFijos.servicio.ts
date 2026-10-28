import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export const EMPRESAS = ['IMPRENTA', 'RADIO'] as const;
export type Empresa = (typeof EMPRESAS)[number];

export const FRECUENCIAS = ['MENSUAL', 'QUINCENAL'] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number];

export interface DatosPagoFijo {
  empresa: Empresa;
  descripcion: string;
  frecuencia: Frecuencia;
  dia1: number;
  dia2?: number | null;
  avisarDias?: number | null;
  notas?: string | null;
  desde?: string | null;
}

/** Con cuántos días de anticipación se enciende el aviso, si no dicen otra cosa. */
export const AVISO_POR_OMISION = 5;

// ------------------------------------------------------------- Fechas
//
// Todo se maneja como 'YYYY-MM-DD' en texto: la base guarda DATE sin hora
// y asi no hay forma de que una zona horaria corra un vencimiento un dia.

const comoTexto = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** Ultimo dia de ese mes: sirve para que un 31 no se salga en febrero. */
const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

/** El dia que toca en ese mes, corrido al ultimo si el mes no llega. */
const diaDelMes = (anio: number, mes: number, dia: number) =>
  comoTexto(anio, mes, Math.min(dia, diasDelMes(anio, mes)));

export function hoyEnTexto() {
  // La base y el contenedor andan en hora de Costa Rica.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
}

/**
 * Los vencimientos de un pago entre dos fechas, en orden. Un pago mensual
 * tiene uno por mes; uno quincenal, dos.
 */
export function vencimientos(
  pago: { frecuencia: Frecuencia; dia_1: number; dia_2: number | null },
  desde: string,
  hasta: string
): string[] {
  const dias = [pago.dia_1, ...(pago.frecuencia === 'QUINCENAL' && pago.dia_2 ? [pago.dia_2] : [])]
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  const fechas: string[] = [];
  const [anioDesde, mesDesde] = desde.split('-').map(Number);
  const [anioHasta, mesHasta] = hasta.split('-').map(Number);

  let anio = anioDesde;
  let mes = mesDesde - 1;
  // Un tope por si acaso: 10 años de vencimientos y no más.
  for (let vuelta = 0; vuelta < 240; vuelta++) {
    if (anio > anioHasta || (anio === anioHasta && mes > mesHasta - 1)) break;
    for (const dia of dias) {
      const fecha = diaDelMes(anio, mes, dia);
      if (fecha >= desde && fecha <= hasta) fechas.push(fecha);
    }
    mes++;
    if (mes > 11) { mes = 0; anio++; }
  }
  return fechas;
}

/** El vencimiento siguiente a una fecha dada. */
function proximoVencimiento(
  pago: { frecuencia: Frecuencia; dia_1: number; dia_2: number | null },
  despuesDe: string
): string {
  const [anio, mes] = despuesDe.split('-').map(Number);
  // Busca en este mes y en los dos siguientes: alcanza de sobra.
  const hasta = diaDelMes(mes + 2 > 12 ? anio + 1 : anio, (mes + 1) % 12, 28);
  const todos = vencimientos(pago, despuesDe, hasta);
  return todos.find((f) => f > despuesDe) ?? hasta;
}

// ------------------------------------------------------------- Consultas

/**
 * Los pagos de una empresa con el estado de cada uno:
 *  - AL_DIA:    todo lo vencido ya tiene comprobante.
 *  - PENDIENTE: toca pagarlo, pero la fecha todavia no llega o es hoy.
 *  - ATRASADO:  ya paso la fecha y no se ha anotado el comprobante.
 */
export async function listar(empresa: Empresa, incluirInactivos = false) {
  const [filas] = await pool.query(
    `SELECT pf.id, pf.empresa, pf.descripcion, pf.frecuencia, pf.dia_1, pf.dia_2,
            pf.avisar_dias, pf.notas, pf.activo, pf.desde, u.nombre_completo AS creado_por,
            (SELECT COUNT(*) FROM pagos_fijos_registros r WHERE r.pago_fijo_id = pf.id)
              AS pagos_anotados
       FROM pagos_fijos pf
       JOIN usuarios u ON u.id = pf.creado_por
      WHERE pf.empresa = ? ${incluirInactivos ? '' : 'AND pf.activo = 1'}
      ORDER BY pf.activo DESC, pf.descripcion`,
    [empresa]
  );

  const pagos = filas as any[];
  if (!pagos.length) return [];

  // Los periodos ya cubiertos, de todos los pagos de una vez.
  const [pagados] = await pool.query(
    `SELECT pago_fijo_id, DATE_FORMAT(periodo, '%Y-%m-%d') AS periodo
       FROM pagos_fijos_registros
      WHERE pago_fijo_id IN (${pagos.map(() => '?').join(',')})`,
    pagos.map((p) => p.id)
  );
  const cubiertos = new Map<number, Set<string>>();
  for (const r of pagados as any[]) {
    if (!cubiertos.has(r.pago_fijo_id)) cubiertos.set(r.pago_fijo_id, new Set());
    cubiertos.get(r.pago_fijo_id)!.add(r.periodo);
  }

  const hoy = hoyEnTexto();

  return pagos.map((p) => {
    const desde = String(p.desde).slice(0, 10);
    const yaPagados = cubiertos.get(p.id) ?? new Set<string>();
    const sinPagar = vencimientos(p, desde, hoy).filter((f) => !yaPagados.has(f));

    const periodo = sinPagar.length ? sinPagar[0] : proximoVencimiento(p, hoy);
    const faltan = Math.round((Date.parse(periodo) - Date.parse(hoy)) / 86_400_000);
    // El aviso se enciende varios dias antes del vencimiento, no el mismo
    // dia: asi da tiempo de hacer el tramite.
    const anticipacion = Number(p.avisar_dias ?? AVISO_POR_OMISION);

    const estado =
      periodo < hoy && sinPagar.length
        ? 'ATRASADO'
        : faltan <= anticipacion
          ? 'PENDIENTE'
          : 'AL_DIA';

    return {
      ...p,
      desde,
      activo: p.activo === 1,
      avisar_dias: anticipacion,
      // El vencimiento que toca cubrir y cuantos quedan sin comprobante.
      periodo,
      estado,
      // Cuantos dias faltan para ese vencimiento (negativo si ya paso).
      faltan,
      atrasados: sinPagar.length > 1 ? sinPagar.length : sinPagar.length === 1 && estado === 'ATRASADO' ? 1 : 0,
      diasDeAtraso:
        estado === 'ATRASADO'
          ? Math.round((Date.parse(hoy) - Date.parse(periodo)) / 86_400_000)
          : 0,
    };
  });
}

export async function historial(pagoFijoId: number, limite = 24) {
  const [filas] = await pool.query(
    `SELECT r.id, DATE_FORMAT(r.periodo, '%Y-%m-%d') AS periodo,
            DATE_FORMAT(r.pagado_en, '%Y-%m-%d') AS pagado_en,
            r.comprobante, r.nota, r.creado_en, u.nombre_completo AS registrado_por
       FROM pagos_fijos_registros r
       JOIN usuarios u ON u.id = r.registrado_por
      WHERE r.pago_fijo_id = ?
      ORDER BY r.periodo DESC
      LIMIT ?`,
    [pagoFijoId, limite]
  );
  return filas;
}

// --------------------------------------------------------------- Cambios

function revisarDatos(datos: DatosPagoFijo) {
  if (datos.frecuencia === 'QUINCENAL') {
    if (!datos.dia2) throw new ErrorHttp(400, 'Un pago quincenal lleva los dos días del mes');
    if (datos.dia2 === datos.dia1) {
      throw new ErrorHttp(400, 'Los dos días de la quincena tienen que ser distintos');
    }
  }
}

export async function crear(datos: DatosPagoFijo, usuarioId: number) {
  revisarDatos(datos);
  const [resultado] = await pool.query(
    `INSERT INTO pagos_fijos
       (empresa, descripcion, frecuencia, dia_1, dia_2, avisar_dias, notas, desde, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.empresa,
      datos.descripcion.trim(),
      datos.frecuencia,
      datos.dia1,
      datos.frecuencia === 'QUINCENAL' ? datos.dia2 : null,
      datos.avisarDias ?? AVISO_POR_OMISION,
      datos.notas?.trim() || null,
      datos.desde || hoyEnTexto(),
      usuarioId,
    ]
  );
  return { id: (resultado as any).insertId };
}

export async function actualizar(id: number, datos: DatosPagoFijo) {
  revisarDatos(datos);
  const [resultado] = await pool.query(
    `UPDATE pagos_fijos
        SET descripcion = ?, frecuencia = ?, dia_1 = ?, dia_2 = ?, avisar_dias = ?,
            notas = ?, desde = ?
      WHERE id = ?`,
    [
      datos.descripcion.trim(),
      datos.frecuencia,
      datos.dia1,
      datos.frecuencia === 'QUINCENAL' ? datos.dia2 : null,
      datos.avisarDias ?? AVISO_POR_OMISION,
      datos.notas?.trim() || null,
      datos.desde || hoyEnTexto(),
      id,
    ]
  );
  if (!(resultado as any).affectedRows) throw new ErrorHttp(404, 'Pago no encontrado');
  return { id };
}

/**
 * Un pago que ya tiene comprobantes anotados no se borra: se desactiva,
 * para no perder el historial. Uno sin nada se borra de una vez.
 */
export async function quitar(id: number) {
  const [filas] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM pagos_fijos_registros r WHERE r.pago_fijo_id = pf.id) AS pagos
       FROM pagos_fijos pf WHERE pf.id = ?`,
    [id]
  );
  const pago = (filas as any[])[0];
  if (!pago) throw new ErrorHttp(404, 'Pago no encontrado');

  if (Number(pago.pagos) > 0) {
    await pool.query(`UPDATE pagos_fijos SET activo = 0 WHERE id = ?`, [id]);
    return { id, desactivado: true };
  }
  await pool.query(`DELETE FROM pagos_fijos WHERE id = ?`, [id]);
  return { id, desactivado: false };
}

export async function reactivar(id: number) {
  await pool.query(`UPDATE pagos_fijos SET activo = 1 WHERE id = ?`, [id]);
  return { id };
}

// ---------------------------------------------------------- "Ya pagó"

/** Anota el comprobante de un vencimiento. */
export async function anotarPago(
  pagoFijoId: number,
  datos: { periodo: string; pagadoEn?: string | null; comprobante: string; nota?: string | null },
  usuarioId: number
) {
  const [filas] = await pool.query(`SELECT id FROM pagos_fijos WHERE id = ?`, [pagoFijoId]);
  if (!(filas as any[])[0]) throw new ErrorHttp(404, 'Pago no encontrado');

  try {
    await pool.query(
      `INSERT INTO pagos_fijos_registros
         (pago_fijo_id, periodo, pagado_en, comprobante, nota, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        pagoFijoId,
        datos.periodo,
        datos.pagadoEn || hoyEnTexto(),
        datos.comprobante.trim(),
        datos.nota?.trim() || null,
        usuarioId,
      ]
    );
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new ErrorHttp(400, 'Ese vencimiento ya tiene su comprobante anotado');
    }
    throw error;
  }
  return { ok: true };
}

/** Para cuando se anotó un comprobante equivocado. */
export async function borrarPago(registroId: number) {
  const [resultado] = await pool.query(`DELETE FROM pagos_fijos_registros WHERE id = ?`, [
    registroId,
  ]);
  if (!(resultado as any).affectedRows) throw new ErrorHttp(404, 'Comprobante no encontrado');
  return { ok: true };
}

/**
 * Cuántos pagos piden atención, por empresa: es lo que pinta el menú. Son
 * los atrasados y los que ya entraron en su ventana de aviso.
 */
export async function pendientes() {
  const resumen: Record<string, number> = {};
  for (const empresa of EMPRESAS) {
    const pagos = await listar(empresa);
    resumen[empresa] = pagos.filter(
      (p) => p.estado === 'ATRASADO' || p.estado === 'PENDIENTE'
    ).length;
  }
  return resumen;
}
