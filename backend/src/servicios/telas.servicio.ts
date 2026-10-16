import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/**
 * Las telas van en su propia tabla, no en materiales_latex, porque el
 * detalle textil apunta directo a ellas. La pantalla las muestra en una
 * pestaña más, al lado de Impresión Digital y HP Latex.
 */
export async function listar() {
  const [filas] = await pool.query(
    `SELECT t.id, t.nombre, t.activo,
            (SELECT COUNT(*) FROM detalle_textil d WHERE d.tela_id = t.id) AS usos
       FROM telas t
      ORDER BY t.nombre`
  );
  return filas;
}

export async function crear(datos: { nombre: string }) {
  const [existe] = await pool.query(`SELECT id FROM telas WHERE nombre = ?`, [datos.nombre]);
  if ((existe as any[]).length) throw new ErrorHttp(409, 'Ya existe una tela con ese nombre');

  const [resultado] = await pool.query(`INSERT INTO telas (nombre) VALUES (?)`, [datos.nombre]);
  return { id: (resultado as any).insertId, nombre: datos.nombre, activo: 1 };
}

export async function actualizar(id: number, datos: { nombre?: string; activo?: boolean }) {
  const [actual] = await pool.query(`SELECT id, nombre FROM telas WHERE id = ?`, [id]);
  const tela = (actual as any[])[0];
  if (!tela) throw new ErrorHttp(404, 'Tela no encontrada');

  if (datos.nombre && datos.nombre !== tela.nombre) {
    const [otra] = await pool.query(`SELECT id FROM telas WHERE nombre = ? AND id <> ?`, [
      datos.nombre,
      id,
    ]);
    if ((otra as any[]).length) throw new ErrorHttp(409, 'Ya existe otra tela con ese nombre');
  }

  await pool.query(
    `UPDATE telas SET nombre = COALESCE(?, nombre), activo = COALESCE(?, activo) WHERE id = ?`,
    [datos.nombre ?? null, datos.activo === undefined ? null : datos.activo ? 1 : 0, id]
  );
  return { mensaje: 'Tela actualizada' };
}

/** Solo se borra la que nunca se usó; el resto se desactiva. */
export async function eliminar(id: number) {
  const [usos] = await pool.query(`SELECT COUNT(*) AS n FROM detalle_textil WHERE tela_id = ?`, [
    id,
  ]);
  if ((usos as any[])[0].n > 0) {
    throw new ErrorHttp(
      400,
      'Esta tela ya se usó en órdenes. Desactívela en lugar de eliminarla.'
    );
  }
  const [resultado] = await pool.query(`DELETE FROM telas WHERE id = ?`, [id]);
  if (!(resultado as any).affectedRows) throw new ErrorHttp(404, 'Tela no encontrada');
}
