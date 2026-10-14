import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/** HP Latex e Impresion Digital comparten tabla pero no comparten lista. */
export const CATEGORIAS = ['LATEX', 'DIGITAL'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export async function listar() {
  const [filas] = await pool.query(
    `SELECT m.id, m.nombre, m.categoria, m.activo,
            COUNT(d.linea_id) AS usos
       FROM materiales_latex m
       LEFT JOIN detalle_latex d ON d.material_id = m.id
      GROUP BY m.id
      ORDER BY m.categoria DESC, m.nombre`
  );
  return filas;
}

export async function crear(datos: { nombre: string; categoria: Categoria }) {
  const [existe] = await pool.query(
    `SELECT id FROM materiales_latex WHERE categoria = ? AND nombre = ?`,
    [datos.categoria, datos.nombre]
  );
  if ((existe as any[]).length) {
    throw new ErrorHttp(409, 'Ya existe un material con ese nombre en esa categoría');
  }

  const [resultado] = await pool.query(
    `INSERT INTO materiales_latex (nombre, categoria) VALUES (?, ?)`,
    [datos.nombre, datos.categoria]
  );
  return { id: (resultado as any).insertId, ...datos, activo: 1 };
}

export async function actualizar(
  id: number,
  datos: { nombre?: string; categoria?: Categoria; activo?: boolean }
) {
  const [actual] = await pool.query(
    `SELECT id, nombre, categoria FROM materiales_latex WHERE id = ?`,
    [id]
  );
  const material = (actual as any[])[0];
  if (!material) throw new ErrorHttp(404, 'Material no encontrado');

  const nombre = datos.nombre ?? material.nombre;
  const categoria = datos.categoria ?? material.categoria;

  if (nombre !== material.nombre || categoria !== material.categoria) {
    const [otro] = await pool.query(
      `SELECT id FROM materiales_latex WHERE categoria = ? AND nombre = ? AND id <> ?`,
      [categoria, nombre, id]
    );
    if ((otro as any[]).length) {
      throw new ErrorHttp(409, 'Ya existe otro material con ese nombre en esa categoría');
    }
  }

  await pool.query(
    `UPDATE materiales_latex
        SET nombre = ?, categoria = ?, activo = COALESCE(?, activo)
      WHERE id = ?`,
    [nombre, categoria, datos.activo === undefined ? null : datos.activo ? 1 : 0, id]
  );
  return { mensaje: 'Material actualizado' };
}

/** Solo se borra el que nunca se uso; el resto se desactiva. */
export async function eliminar(id: number) {
  const [usos] = await pool.query(
    `SELECT COUNT(*) AS n FROM detalle_latex WHERE material_id = ?`,
    [id]
  );
  if ((usos as any[])[0].n > 0) {
    throw new ErrorHttp(
      400,
      'Este material ya se usó en órdenes. Desactívelo en lugar de eliminarlo.'
    );
  }
  const [resultado] = await pool.query(`DELETE FROM materiales_latex WHERE id = ?`, [id]);
  if (!(resultado as any).affectedRows) throw new ErrorHttp(404, 'Material no encontrado');
}
