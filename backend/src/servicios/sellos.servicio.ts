import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/** Inventario con filtro por tinta y orden configurable. */
export async function listar(filtros: { tintaId?: number; busqueda?: string; orden?: string }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.tintaId) {
    condiciones.push('s.tinta_id = ?');
    valores.push(filtros.tintaId);
  }
  if (filtros.busqueda) {
    condiciones.push('(s.codigo LIKE ? OR s.descripcion LIKE ?)');
    valores.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
  }

  const where = condiciones.length ? `AND ${condiciones.join(' AND ')}` : '';

  // Lista blanca: nunca interpolamos texto del usuario en el ORDER BY.
  const ordenes: Record<string, string> = {
    codigo: 's.codigo',
    cantidad: 's.cantidad DESC',
    tinta: 't.nombre, s.codigo',
  };
  const orderBy = ordenes[filtros.orden ?? 'codigo'] ?? 's.codigo';

  const [filas] = await pool.query(
    `SELECT s.id, s.codigo, s.descripcion, s.cantidad, s.minimo,
            s.tinta_id, t.nombre AS tinta, t.hex AS tinta_hex,
            (s.cantidad <= s.minimo) AS bajo_minimo, s.actualizado_en
       FROM sellos_inventario s
       JOIN tintas t ON t.id = s.tinta_id
      WHERE s.activo = 1 ${where}
      ORDER BY ${orderBy}`,
    valores
  );
  return filas;
}

/** Resumen para vendedores y recepción: solo cuántos hay y de qué tinta. */
export async function resumen() {
  const [filas] = await pool.query(
    `SELECT t.nombre AS tinta, t.hex AS tinta_hex,
            COUNT(s.id) AS tipos, COALESCE(SUM(s.cantidad), 0) AS total
       FROM tintas t
       LEFT JOIN sellos_inventario s ON s.tinta_id = t.id AND s.activo = 1
      GROUP BY t.id
      HAVING tipos > 0
      ORDER BY t.nombre`
  );
  return filas;
}

export async function crear(datos: {
  codigo: string;
  descripcion?: string | null;
  tintaId: number;
  cantidad: number;
  minimo?: number;
}) {
  const [existe] = await pool.query(`SELECT id FROM sellos_inventario WHERE codigo = ?`, [
    datos.codigo,
  ]);
  if ((existe as any[]).length) throw new ErrorHttp(409, 'Ya existe un sello con ese código');

  const [resultado] = await pool.query(
    `INSERT INTO sellos_inventario (codigo, descripcion, tinta_id, cantidad, minimo)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.codigo, datos.descripcion ?? null, datos.tintaId, datos.cantidad, datos.minimo ?? 0]
  );
  return { id: (resultado as any).insertId, ...datos };
}

/** Movimiento de existencias: el procedimiento guarda el saldo antes y después. */
export async function mover(
  selloId: number,
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
  cantidad: number,
  usuarioId: number,
  motivo?: string
) {
  try {
    await pool.query(`CALL sp_mover_sello(?, ?, ?, ?, ?)`, [
      selloId,
      tipo,
      cantidad,
      usuarioId,
      motivo ?? null,
    ]);
  } catch (error: any) {
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }

  const [filas] = await pool.query(
    `SELECT id, codigo, cantidad FROM sellos_inventario WHERE id = ?`,
    [selloId]
  );
  return (filas as any[])[0];
}

export async function movimientos(selloId: number, limite = 50) {
  const [filas] = await pool.query(
    `SELECT sm.tipo, sm.cantidad, sm.saldo_anterior, sm.saldo_nuevo,
            sm.motivo, sm.creado_en, u.nombre_completo AS usuario
       FROM sellos_movimientos sm
       JOIN usuarios u ON u.id = sm.usuario_id
      WHERE sm.sello_id = ?
      ORDER BY sm.creado_en DESC
      LIMIT ?`,
    [selloId, limite]
  );
  return filas;
}

export async function actualizar(
  id: number,
  datos: { descripcion?: string | null; tintaId?: number; minimo?: number; activo?: boolean }
) {
  await pool.query(
    `UPDATE sellos_inventario
        SET descripcion = COALESCE(?, descripcion),
            tinta_id = COALESCE(?, tinta_id),
            minimo = COALESCE(?, minimo),
            activo = COALESCE(?, activo)
      WHERE id = ?`,
    [
      datos.descripcion ?? null,
      datos.tintaId ?? null,
      datos.minimo ?? null,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
    ]
  );
  return { mensaje: 'Sello actualizado' };
}