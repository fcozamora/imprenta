import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export type EstadoPago = 'SIN_PRECIO' | 'PENDIENTE' | 'ABONADO' | 'CANCELADA';

export const METODOS_PAGO = [
  'EFECTIVO',
  'SINPE',
  'TRANSFERENCIA',
  'TARJETA',
  'CHEQUE',
] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

/** Como se lee el metodo en la bitacora: "Abono de ₡5 000,00 por Sinpe". */
const COMO_SE_LEE: Record<MetodoPago, string> = {
  EFECTIVO: 'en efectivo',
  SINPE: 'por Sinpe',
  TRANSFERENCIA: 'por transferencia',
  TARJETA: 'con tarjeta',
  CHEQUE: 'con cheque',
};

/**
 * El total de la orden es la suma de los precios de sus trabajos, y el
 * estado sale de comparar lo abonado contra ese total. No hay una casilla
 * de "cancelada" guardada en ningun lado: si manana se corrige el precio
 * hacia arriba, la orden vuelve sola a Abonado con su saldo.
 */
export async function resumen(ordenId: number) {
  const [filas] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(ol.precio), 0) FROM orden_lineas ol WHERE ol.orden_id = ?) AS total,
       (SELECT COALESCE(SUM(a.monto), 0) FROM orden_abonos a WHERE a.orden_id = ?)    AS abonado,
       (SELECT COUNT(*) FROM orden_lineas ol WHERE ol.orden_id = ? AND ol.precio IS NOT NULL)
         AS lineas_con_precio,
       (SELECT COUNT(*) FROM orden_lineas ol WHERE ol.orden_id = ?) AS lineas`,
    [ordenId, ordenId, ordenId, ordenId]
  );
  const f = (filas as any[])[0];
  const total = Number(f.total);
  const abonado = Number(f.abonado);
  const saldo = Number((total - abonado).toFixed(2));

  // Sin un solo precio anotado no se puede hablar de saldo.
  const estado: EstadoPago =
    f.lineas_con_precio === 0
      ? 'SIN_PRECIO'
      : abonado <= 0
        ? 'PENDIENTE'
        : saldo <= 0
          ? 'CANCELADA'
          : 'ABONADO';

  return {
    total,
    abonado,
    saldo: saldo > 0 ? saldo : 0,
    aFavor: saldo < 0 ? Math.abs(saldo) : 0,
    estado,
    // Avisa que el total esta incompleto: hay trabajos sin precio anotado.
    precioIncompleto: f.lineas_con_precio > 0 && f.lineas_con_precio < f.lineas,
  };
}

export async function listar(ordenId: number) {
  const [filas] = await pool.query(
    `SELECT a.id, a.monto, a.metodo_pago, a.nota, a.creado_en,
            u.nombre_completo AS registrado_por
       FROM orden_abonos a
       JOIN usuarios u ON u.id = a.registrado_por
      WHERE a.orden_id = ?
      ORDER BY a.creado_en, a.id`,
    [ordenId]
  );
  return filas;
}

async function exigirOrden(ordenId: number) {
  const [filas] = await pool.query(`SELECT id, estado FROM ordenes WHERE id = ?`, [ordenId]);
  const orden = (filas as any[])[0];
  if (!orden) throw new ErrorHttp(404, 'Orden no encontrada');
  if (orden.estado === 'ANULADA') throw new ErrorHttp(400, 'La orden está anulada');
  return orden;
}

/**
 * Anota un abono. Con `saldar` se anota lo que falte para dejarla
 * cancelada, que es lo que hace la casilla "Ya está cancelada".
 */
export async function registrar(
  ordenId: number,
  datos: { monto?: number; saldar?: boolean; metodo: MetodoPago; nota?: string | null },
  usuarioId: number
) {
  await exigirOrden(ordenId);
  const antes = await resumen(ordenId);

  if (antes.estado === 'SIN_PRECIO') {
    throw new ErrorHttp(400, 'Primero hay que anotarle el precio a los trabajos de la orden');
  }

  const monto = datos.saldar ? antes.saldo : Number(datos.monto ?? 0);
  if (!(monto > 0)) {
    throw new ErrorHttp(
      400,
      datos.saldar ? 'La orden ya está cancelada' : 'El abono tiene que ser mayor que cero'
    );
  }

  await pool.query(
    `INSERT INTO orden_abonos (orden_id, monto, metodo_pago, nota, registrado_por)
     VALUES (?, ?, ?, ?, ?)`,
    [ordenId, monto, datos.metodo, datos.nota?.trim() || null, usuarioId]
  );

  const despues = await resumen(ordenId);
  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
     VALUES ('ordenes', ?, 'UPDATE', ?, JSON_OBJECT('edicion', 'pago'), ?)`,
    [
      ordenId,
      usuarioId,
      JSON.stringify({
        edicion: 'pago',
        cambios: [
          `Abono de ${colones(monto)} ${COMO_SE_LEE[datos.metodo]}` +
            ` · saldo ${colones(antes.saldo)} → ${colones(despues.saldo)}` +
            (despues.estado === 'CANCELADA' ? ' · queda cancelada' : ''),
        ],
      }),
    ]
  );

  return despues;
}

/** Para cuando se anota un abono equivocado. Queda registrado igual. */
export async function eliminar(abonoId: number, usuarioId: number) {
  const [filas] = await pool.query(
    `SELECT id, orden_id, monto FROM orden_abonos WHERE id = ?`,
    [abonoId]
  );
  const abono = (filas as any[])[0];
  if (!abono) throw new ErrorHttp(404, 'Abono no encontrado');

  await pool.query(`DELETE FROM orden_abonos WHERE id = ?`, [abonoId]);

  const despues = await resumen(abono.orden_id);
  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
     VALUES ('ordenes', ?, 'UPDATE', ?, JSON_OBJECT('edicion', 'pago'), ?)`,
    [
      abono.orden_id,
      usuarioId,
      JSON.stringify({
        edicion: 'pago',
        cambios: [
          `Se quitó un abono de ${colones(Number(abono.monto))} · saldo ${colones(despues.saldo)}`,
        ],
      }),
    ]
  );

  return despues;
}

function colones(v: number) {
  return `₡${v.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
