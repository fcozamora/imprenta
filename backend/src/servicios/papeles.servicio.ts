import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export const CATEGORIAS = ['BOND', 'BRISTOL', 'QUIMICO', 'ESPECIAL'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export async function listar(soloActivos = false) {
  const [filas] = await pool.query(
    `SELECT p.id, p.nombre, p.categoria, p.es_original, p.activo,
            p.resmas, p.minimo, p.actualizado_en,
            (p.resmas <= p.minimo) AS bajo_minimo,
            COUNT(tc.linea_id) AS usos
       FROM tipos_papel p
       LEFT JOIN talonario_copias tc ON tc.papel_id = p.id
      ${soloActivos ? 'WHERE p.activo = 1' : ''}
      GROUP BY p.id
      ORDER BY FIELD(p.categoria,'QUIMICO','BOND','BRISTOL','ESPECIAL'), p.nombre`
  );
  return filas;
}

export async function crear(datos: {
  nombre: string;
  categoria: Categoria;
  esOriginal?: boolean;
}) {
  const [existe] = await pool.query(`SELECT id FROM tipos_papel WHERE nombre = ?`, [
    datos.nombre,
  ]);
  if ((existe as any[]).length) throw new ErrorHttp(409, 'Ya existe un papel con ese nombre');

  // Solo un papel puede ser el original de los talonarios.
  if (datos.esOriginal) {
    await pool.query(`UPDATE tipos_papel SET es_original = 0`);
  }

  const [resultado] = await pool.query(
    `INSERT INTO tipos_papel (nombre, categoria, es_original) VALUES (?, ?, ?)`,
    [datos.nombre, datos.categoria, datos.esOriginal ? 1 : 0]
  );
  return { id: (resultado as any).insertId, ...datos };
}

export async function actualizar(
  id: number,
  datos: { nombre?: string; categoria?: Categoria; esOriginal?: boolean; activo?: boolean; minimo?: number }
) {
  const [actual] = await pool.query(
    `SELECT id, nombre, es_original FROM tipos_papel WHERE id = ?`,
    [id]
  );
  const papel = (actual as any[])[0];
  if (!papel) throw new ErrorHttp(404, 'Papel no encontrado');

  if (datos.nombre && datos.nombre !== papel.nombre) {
    const [otro] = await pool.query(`SELECT id FROM tipos_papel WHERE nombre = ? AND id <> ?`, [
      datos.nombre,
      id,
    ]);
    if ((otro as any[]).length) throw new ErrorHttp(409, 'Ya existe otro papel con ese nombre');
  }

  if (datos.esOriginal) {
    await pool.query(`UPDATE tipos_papel SET es_original = 0 WHERE id <> ?`, [id]);
  }

  // Desactivar el papel original dejaría los talonarios sin original.
  if (datos.activo === false && papel.es_original) {
    throw new ErrorHttp(400, 'No puede desactivar el papel marcado como original');
  }

  await pool.query(
    `UPDATE tipos_papel
        SET nombre = COALESCE(?, nombre),
            categoria = COALESCE(?, categoria),
            es_original = COALESCE(?, es_original),
            minimo = COALESCE(?, minimo),
            activo = COALESCE(?, activo)
      WHERE id = ?`,
    [
      datos.nombre ?? null,
      datos.categoria ?? null,
      datos.esOriginal === undefined ? null : datos.esOriginal ? 1 : 0,
      datos.minimo ?? null,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
    ]
  );
  return { mensaje: 'Papel actualizado' };
}

/** Movimiento de existencias: el procedimiento guarda el saldo antes y después. */
export async function mover(
  papelId: number,
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
  cantidad: number,
  usuarioId: number,
  motivo?: string
) {
  try {
    await pool.query(`CALL sp_mover_papel(?, ?, ?, ?, ?)`, [
      papelId,
      tipo,
      cantidad,
      usuarioId,
      motivo?.trim() || null,
    ]);
  } catch (error: any) {
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }

  const [filas] = await pool.query(
    `SELECT id, nombre, resmas FROM tipos_papel WHERE id = ?`,
    [papelId]
  );
  return (filas as any[])[0];
}

export async function movimientos(papelId: number, limite = 50) {
  const [filas] = await pool.query(
    `SELECT m.tipo, m.cantidad, m.saldo_anterior, m.saldo_nuevo,
            m.motivo, m.creado_en, u.nombre_completo AS usuario
       FROM papeles_movimientos m
       JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.papel_id = ?
      ORDER BY m.creado_en DESC
      LIMIT ?`,
    [papelId, limite]
  );
  return filas;
}