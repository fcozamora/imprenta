import { enTransaccion, pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export async function crear(
  usuarioId: number,
  lineas: Array<{ cantidad: string; producto: string }>,
  nota?: string
) {
  const utiles = lineas.filter((l) => l.producto?.trim());
  if (!utiles.length) throw new ErrorHttp(400, 'Agregue al menos un producto');

  return enTransaccion(async (cx) => {
    // El trigger de esta tabla genera la notificación al administrador.
    const [resultado] = await cx.query(
      `INSERT INTO solicitudes_material (usuario_id, nota) VALUES (?, ?)`,
      [usuarioId, nota ?? null]
    );
    const solicitudId = (resultado as any).insertId;

    const valores = utiles.map((l, i) => [solicitudId, i + 1, l.cantidad || '1', l.producto.trim()]);
    await cx.query(
      `INSERT INTO solicitud_material_lineas (solicitud_id, linea, cantidad, producto) VALUES ?`,
      [valores]
    );

    return { id: solicitudId, lineas: utiles.length };
  });
}

export async function listar(filtros: { estado?: string; usuarioId?: number }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.estado) {
    condiciones.push('s.estado = ?');
    valores.push(filtros.estado);
  }
  if (filtros.usuarioId) {
    condiciones.push('s.usuario_id = ?');
    valores.push(filtros.usuarioId);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT s.id, s.estado, s.nota, s.creado_en, s.atendida_en,
            u.nombre_completo AS solicitante, p.nombre AS puesto,
            a.nombre_completo AS atendida_por,
            COUNT(l.id) AS total_lineas
       FROM solicitudes_material s
       JOIN usuarios u ON u.id = s.usuario_id
       JOIN puestos p ON p.id = u.puesto_id
       LEFT JOIN usuarios a ON a.id = s.atendida_por
       LEFT JOIN solicitud_material_lineas l ON l.solicitud_id = s.id
       ${where}
      GROUP BY s.id
      ORDER BY s.creado_en DESC
      LIMIT 200`,
    valores
  );
  return filas;
}

export async function obtener(id: number) {
  const [cabeceras] = await pool.query(
    `SELECT s.id, s.estado, s.nota, s.creado_en, s.atendida_en,
            u.nombre_completo AS solicitante, a.nombre_completo AS atendida_por
       FROM solicitudes_material s
       JOIN usuarios u ON u.id = s.usuario_id
       LEFT JOIN usuarios a ON a.id = s.atendida_por
      WHERE s.id = ?`,
    [id]
  );
  const solicitud = (cabeceras as any[])[0];
  if (!solicitud) throw new ErrorHttp(404, 'Solicitud no encontrada');

  const [lineas] = await pool.query(
    `SELECT linea, cantidad, producto FROM solicitud_material_lineas
      WHERE solicitud_id = ? ORDER BY linea`,
    [id]
  );
  return { ...solicitud, lineas };
}

export async function cambiarEstado(
  id: number,
  estado: 'PENDIENTE' | 'APROBADA' | 'COMPRADA' | 'RECHAZADA',
  usuarioId: number
) {
  await obtener(id);
  await pool.query(
    `UPDATE solicitudes_material
        SET estado = ?, atendida_por = ?, atendida_en = NOW()
      WHERE id = ?`,
    [estado, usuarioId, id]
  );
  return { mensaje: `Solicitud marcada como ${estado.toLowerCase()}` };
}