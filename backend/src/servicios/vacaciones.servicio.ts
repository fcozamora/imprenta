import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/**
 * Los dias tomados no se guardan: se suman de las solicitudes aprobadas.
 * Asi el saldo nunca puede quedar torcido por un contador mal actualizado.
 */
const SELECT_SALDO = `
  SELECT u.id              AS usuario_id,
         u.cedula,
         u.nombre_completo AS usuario,
         p.nombre          AS puesto,
         COALESCE(s.dias_totales, 0) AS dias_totales,
         COALESCE(SUM(CASE WHEN v.estado = 'APROBADA'  THEN v.dias END), 0) AS tomados,
         COALESCE(SUM(CASE WHEN v.estado = 'PENDIENTE' THEN v.dias END), 0) AS pendientes,
         COALESCE(s.dias_totales, 0)
           - COALESCE(SUM(CASE WHEN v.estado = 'APROBADA' THEN v.dias END), 0) AS disponibles,
         s.nota,
         s.actualizado_en
    FROM usuarios u
    JOIN puestos p ON p.id = u.puesto_id
    LEFT JOIN vacaciones_saldos s      ON s.usuario_id = u.id
    LEFT JOIN vacaciones_solicitudes v ON v.usuario_id = u.id`;

const SELECT_SOLICITUD = `
  SELECT v.id, v.usuario_id, u.nombre_completo AS usuario, p.nombre AS puesto,
         v.fecha_inicio, v.fecha_fin, v.medio_dia, v.dias, v.motivo, v.estado,
         v.modificada, v.inicio_pedido, v.fin_pedido,
         v.resuelta_por, r.nombre_completo AS resuelta_por_nombre,
         v.resuelta_en, v.nota_resolucion, v.creado_en
    FROM vacaciones_solicitudes v
    JOIN usuarios u ON u.id = v.usuario_id
    JOIN puestos p  ON p.id = u.puesto_id
    LEFT JOIN usuarios r ON r.id = v.resuelta_por`;

// ------------------------------------------------------------------ Saldos

/** Todas las personas activas, con lo asignado y lo que llevan tomado. */
export async function saldos() {
  const [filas] = await pool.query(
    `${SELECT_SALDO}
      WHERE u.activo = 1 AND u.cedula <> '000000000'
      GROUP BY u.id
      ORDER BY u.apellido, u.nombre`
  );
  return filas;
}

export async function saldoDe(usuarioId: number) {
  const [filas] = await pool.query(
    `${SELECT_SALDO} WHERE u.id = ? GROUP BY u.id`,
    [usuarioId]
  );
  const saldo = (filas as any[])[0];
  if (!saldo) throw new ErrorHttp(404, 'Usuario no encontrado');
  return saldo;
}

export async function fijarDias(
  usuarioId: number,
  dias: number,
  nota: string | null,
  porUsuarioId: number
) {
  const [existe] = await pool.query(`SELECT id FROM usuarios WHERE id = ?`, [usuarioId]);
  if (!(existe as any[]).length) throw new ErrorHttp(404, 'Usuario no encontrado');

  await pool.query(
    `INSERT INTO vacaciones_saldos (usuario_id, dias_totales, nota, actualizado_por)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE dias_totales = VALUES(dias_totales),
                             nota = VALUES(nota),
                             actualizado_por = VALUES(actualizado_por)`,
    [usuarioId, dias, nota, porUsuarioId]
  );
  return saldoDe(usuarioId);
}

// ------------------------------------------------------------- Solicitudes

export async function listar(filtros: {
  usuarioId?: number;
  estado?: string;
}) {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.usuarioId) {
    condiciones.push('v.usuario_id = ?');
    valores.push(filtros.usuarioId);
  }
  if (filtros.estado) {
    condiciones.push('v.estado = ?');
    valores.push(filtros.estado);
  }

  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `${SELECT_SOLICITUD}${where}
      ORDER BY FIELD(v.estado,'PENDIENTE','APROBADA','RECHAZADA','CANCELADA'),
               v.fecha_inicio DESC
      LIMIT 300`,
    valores
  );
  return filas;
}

export async function obtener(id: number) {
  const [filas] = await pool.query(`${SELECT_SOLICITUD} WHERE v.id = ?`, [id]);
  const solicitud = (filas as any[])[0];
  if (!solicitud) throw new ErrorHttp(404, 'Solicitud no encontrada');
  return solicitud;
}

export interface NuevaSolicitud {
  fechaInicio: string;
  fechaFin: string;
  medioDia?: boolean;
  motivo?: string | null;
}

export async function solicitar(usuarioId: number, datos: NuevaSolicitud) {
  const medio = datos.medioDia ? 1 : 0;
  const fin = medio ? datos.fechaInicio : datos.fechaFin;

  if (fin < datos.fechaInicio) {
    throw new ErrorHttp(400, 'La fecha final no puede ser anterior a la inicial');
  }

  // Dos solicitudes vivas sobre los mismos dias serian un descuento doble.
  const [choques] = await pool.query(
    `SELECT id FROM vacaciones_solicitudes
      WHERE usuario_id = ? AND estado IN ('PENDIENTE','APROBADA')
        AND fecha_inicio <= ? AND fecha_fin >= ?`,
    [usuarioId, fin, datos.fechaInicio]
  );
  if ((choques as any[]).length) {
    throw new ErrorHttp(409, 'Ya hay una solicitud suya sobre esas mismas fechas');
  }

  try {
    const [res] = await pool.query(
      `INSERT INTO vacaciones_solicitudes
         (usuario_id, fecha_inicio, fecha_fin, medio_dia, motivo)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, datos.fechaInicio, fin, medio, datos.motivo?.trim() || null]
    );
    return obtener((res as any).insertId);
  } catch (error: any) {
    // El disparador rechaza los rangos sin dias habiles.
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }
}

/**
 * Administracion resuelve: aprueba o rechaza, y de paso puede mover las
 * fechas. Queda aplicado en un solo paso, con las fechas pedidas guardadas
 * aparte para que se vea que hubo un ajuste.
 */
export async function resolver(
  id: number,
  datos: {
    estado: 'APROBADA' | 'RECHAZADA';
    fechaInicio?: string | null;
    fechaFin?: string | null;
    medioDia?: boolean | null;
    nota?: string | null;
  },
  porUsuarioId: number
) {
  const actual = await obtener(id);
  if (actual.estado !== 'PENDIENTE') {
    throw new ErrorHttp(400, 'Esa solicitud ya fue resuelta');
  }

  const medio = datos.medioDia === undefined || datos.medioDia === null
    ? actual.medio_dia
    : datos.medioDia ? 1 : 0;
  const inicio = datos.fechaInicio || String(actual.fecha_inicio).slice(0, 10);
  const fin = medio ? inicio : datos.fechaFin || String(actual.fecha_fin).slice(0, 10);

  if (fin < inicio) {
    throw new ErrorHttp(400, 'La fecha final no puede ser anterior a la inicial');
  }

  try {
    await pool.query(
      `UPDATE vacaciones_solicitudes
          SET fecha_inicio = ?, fecha_fin = ?, medio_dia = ?,
              estado = ?, resuelta_por = ?, resuelta_en = NOW(), nota_resolucion = ?
        WHERE id = ?`,
      [inicio, fin, medio, datos.estado, porUsuarioId, datos.nota?.trim() || null, id]
    );
  } catch (error: any) {
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }

  return obtener(id);
}

/** Quien pidio puede retirar su solicitud mientras nadie la haya resuelto. */
export async function cancelar(id: number, usuarioId: number) {
  const actual = await obtener(id);
  if (actual.usuario_id !== usuarioId) {
    throw new ErrorHttp(403, 'Solo quien hizo la solicitud puede retirarla');
  }
  if (actual.estado !== 'PENDIENTE') {
    throw new ErrorHttp(400, 'Esa solicitud ya fue resuelta');
  }
  await pool.query(`UPDATE vacaciones_solicitudes SET estado = 'CANCELADA' WHERE id = ?`, [id]);
  return obtener(id);
}
