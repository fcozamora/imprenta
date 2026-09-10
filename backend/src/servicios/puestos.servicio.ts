import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export async function listar(soloActivos = false) {
  const [filas] = await pool.query(
    `SELECT p.id, p.codigo, p.nombre, p.descripcion, p.activo,
            COUNT(DISTINCT u.id) AS usuarios,
            COALESCE(GROUP_CONCAT(DISTINCT pp.permiso_codigo), '') AS permisos
       FROM puestos p
       LEFT JOIN usuarios u ON u.puesto_id = p.id AND u.activo = 1
       LEFT JOIN puesto_permisos pp ON pp.puesto_id = p.id
      ${soloActivos ? 'WHERE p.activo = 1' : ''}
      GROUP BY p.id
      ORDER BY p.nombre`
  );
  return (filas as any[]).map((f) => ({
    ...f,
    permisos: f.permisos ? String(f.permisos).split(',') : [],
  }));
}

export async function listarPermisos() {
  const [filas] = await pool.query(
    `SELECT codigo, modulo, descripcion FROM permisos ORDER BY modulo, codigo`
  );
  return filas;
}

export async function crear(datos: {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  permisos?: string[];
}) {
  const [existe] = await pool.query(`SELECT id FROM puestos WHERE codigo = ? OR nombre = ?`, [
    datos.codigo,
    datos.nombre,
  ]);
  if ((existe as any[]).length) {
    throw new ErrorHttp(409, 'Ya existe un puesto con ese código o nombre');
  }

  const [resultado] = await pool.query(
    `INSERT INTO puestos (codigo, nombre, descripcion) VALUES (?, ?, ?)`,
    [datos.codigo, datos.nombre, datos.descripcion ?? null]
  );
  const id = (resultado as any).insertId;

  if (datos.permisos?.length) {
    await asignarPermisos(id, datos.permisos);
  }
  return { id, ...datos };
}

export async function asignarPermisos(puestoId: number, permisos: string[]) {
  const [puesto] = await pool.query(`SELECT id FROM puestos WHERE id = ?`, [puestoId]);
  if (!(puesto as any[]).length) throw new ErrorHttp(404, 'Puesto no encontrado');

  await pool.query(`DELETE FROM puesto_permisos WHERE puesto_id = ?`, [puestoId]);

  if (permisos.length) {
    const valores = permisos.map((codigo) => [puestoId, codigo]);
    await pool.query(`INSERT INTO puesto_permisos (puesto_id, permiso_codigo) VALUES ?`, [valores]);
  }
  return { mensaje: 'Permisos actualizados', total: permisos.length };
}

export async function actualizar(
  id: number,
  datos: { nombre?: string; descripcion?: string | null; activo?: boolean }
) {
  const [existe] = await pool.query(`SELECT id FROM puestos WHERE id = ?`, [id]);
  if (!(existe as any[]).length) throw new ErrorHttp(404, 'Puesto no encontrado');

  await pool.query(
    `UPDATE puestos
        SET nombre = COALESCE(?, nombre),
            descripcion = COALESCE(?, descripcion),
            activo = COALESCE(?, activo)
      WHERE id = ?`,
    [
      datos.nombre ?? null,
      datos.descripcion ?? null,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
    ]
  );
  return { mensaje: 'Puesto actualizado' };
}