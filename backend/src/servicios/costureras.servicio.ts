import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export async function listar(soloActivas = true) {
  const [filas] = await pool.query(
    `SELECT c.id, c.nombre, c.telefono, c.notas, c.activo,
            COUNT(dt.linea_id) AS trabajos
       FROM costureras c
       LEFT JOIN detalle_textil dt ON dt.costurera_id = c.id
      ${soloActivas ? 'WHERE c.activo = 1' : ''}
      GROUP BY c.id
      ORDER BY c.activo DESC, c.nombre`
  );
  return filas;
}

export async function crear(datos: {
  nombre: string;
  telefono?: string | null;
  notas?: string | null;
}) {
  const [existe] = await pool.query(`SELECT id FROM costureras WHERE nombre = ?`, [datos.nombre]);
  if ((existe as any[]).length) throw new ErrorHttp(409, 'Ya existe una costurera con ese nombre');

  const [resultado] = await pool.query(
    `INSERT INTO costureras (nombre, telefono, notas) VALUES (?, ?, ?)`,
    [datos.nombre, datos.telefono ?? null, datos.notas ?? null]
  );
  return { id: (resultado as any).insertId, ...datos };
}

export async function actualizar(
  id: number,
  datos: { nombre?: string; telefono?: string | null; notas?: string | null; activo?: boolean }
) {
  const [existe] = await pool.query(`SELECT id FROM costureras WHERE id = ?`, [id]);
  if (!(existe as any[]).length) throw new ErrorHttp(404, 'Costurera no encontrada');

  await pool.query(
    `UPDATE costureras
        SET nombre = COALESCE(?, nombre),
            telefono = COALESCE(?, telefono),
            notas = COALESCE(?, notas),
            activo = COALESCE(?, activo)
      WHERE id = ?`,
    [
      datos.nombre ?? null,
      datos.telefono ?? null,
      datos.notas ?? null,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
    ]
  );
  return { mensaje: 'Costurera actualizada' };
}

/** Asigna la costurera a un trabajo textil. */
export async function asignarATrabajo(lineaId: number, costureraId: number) {
  const [linea] = await pool.query(
    `SELECT ol.id, tt.codigo
       FROM orden_lineas ol
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
      WHERE ol.id = ?`,
    [lineaId]
  );
  const fila = (linea as any[])[0];
  if (!fila) throw new ErrorHttp(404, 'Línea de orden no encontrada');
  if (fila.codigo !== 'TEXTIL') {
    throw new ErrorHttp(400, 'Solo los trabajos textiles llevan costurera');
  }

  const [costurera] = await pool.query(`SELECT id FROM costureras WHERE id = ? AND activo = 1`, [
    costureraId,
  ]);
  if (!(costurera as any[]).length) {
    throw new ErrorHttp(400, 'La costurera indicada no existe o está inactiva');
  }

  await pool.query(`UPDATE detalle_textil SET costurera_id = ? WHERE linea_id = ?`, [
    costureraId,
    lineaId,
  ]);
  return { mensaje: 'Costurera asignada' };
}

/** Reporte: cuánto trabajo tiene cada costurera. */
export async function cargaDeTrabajo() {
  const [filas] = await pool.query(
    `SELECT c.id, c.nombre,
            SUM(ol.finalizada = 0) AS en_proceso,
            SUM(ol.finalizada = 1) AS terminados,
            SUM(ol.cantidad)       AS piezas
       FROM costureras c
       LEFT JOIN detalle_textil dt ON dt.costurera_id = c.id
       LEFT JOIN orden_lineas ol ON ol.id = dt.linea_id
      WHERE c.activo = 1
      GROUP BY c.id
      ORDER BY en_proceso DESC, c.nombre`
  );
  return filas;
}