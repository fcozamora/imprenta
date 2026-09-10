import { pool } from '../db/pool.js';

/** Las últimas notificaciones del usuario, con las no leídas primero. */
export async function listar(usuarioId: number, soloNoLeidas = false, limite = 50) {
  const [filas] = await pool.query(
    `SELECT n.id, n.tipo, n.titulo, n.mensaje, n.orden_id, n.linea_id,
            n.url_destino, n.creada_en, nd.leida_en,
            (nd.leida_en IS NULL) AS no_leida,
            o.numero_orden
       FROM notificacion_destinatarios nd
       JOIN notificaciones n ON n.id = nd.notificacion_id
       LEFT JOIN ordenes o ON o.id = n.orden_id
      WHERE nd.usuario_id = ?
        ${soloNoLeidas ? 'AND nd.leida_en IS NULL' : ''}
      ORDER BY no_leida DESC, n.creada_en DESC
      LIMIT ?`,
    [usuarioId, limite]
  );
  return filas;
}

/** El número de la "bolita" del ícono de campana. */
export async function contarNoLeidas(usuarioId: number) {
  const [filas] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM notificacion_destinatarios
      WHERE usuario_id = ? AND leida_en IS NULL`,
    [usuarioId]
  );
  return { total: (filas as any[])[0].total as number };
}

export async function marcarLeida(usuarioId: number, notificacionId: number) {
  await pool.query(
    `UPDATE notificacion_destinatarios
        SET leida_en = NOW()
      WHERE usuario_id = ? AND notificacion_id = ? AND leida_en IS NULL`,
    [usuarioId, notificacionId]
  );
  return contarNoLeidas(usuarioId);
}

export async function marcarTodas(usuarioId: number) {
  await pool.query(
    `UPDATE notificacion_destinatarios
        SET leida_en = NOW()
      WHERE usuario_id = ? AND leida_en IS NULL`,
    [usuarioId]
  );
  return { total: 0 };
}