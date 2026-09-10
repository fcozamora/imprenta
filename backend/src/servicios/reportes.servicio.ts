import { pool } from '../db/pool.js';

export interface RangoFechas {
  desde?: string;
  hasta?: string;
}

/** Bitácora: qué hizo cada trabajador de producción, con fechas. */
export async function bitacora(filtros: RangoFechas & { usuarioId?: number; puestoId?: number }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.usuarioId) {
    condiciones.push('usuario_id = ?');
    valores.push(filtros.usuarioId);
  }
  if (filtros.desde) {
    condiciones.push('DATE(marcada_en) >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('DATE(marcada_en) <= ?');
    valores.push(filtros.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT * FROM v_bitacora_trabajadores
     ${where}
     ORDER BY marcada_en DESC
     LIMIT 1000`,
    valores
  );
  return filas;
}

/** Resumen por trabajador: cuántas etapas marcó y cuánto tardó en promedio. */
export async function resumenTrabajadores(filtros: RangoFechas) {
  const condiciones: string[] = ['u.activo = 1'];
  const valores: any[] = [];

  if (filtros.desde) {
    condiciones.push('DATE(le.marcada_en) >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('DATE(le.marcada_en) <= ?');
    valores.push(filtros.hasta);
  }

  const [filas] = await pool.query(
    `SELECT u.id, u.nombre_completo AS trabajador, p.nombre AS puesto,
            COUNT(le.id) AS etapas_marcadas,
            COUNT(DISTINCT ol.orden_id) AS ordenes,
            ROUND(AVG(le.minutos_en_etapa) / 60, 1) AS horas_promedio,
            MAX(le.marcada_en) AS ultima_actividad
       FROM usuarios u
       JOIN puestos p ON p.id = u.puesto_id
       LEFT JOIN linea_etapas le ON le.usuario_id = u.id
       LEFT JOIN orden_lineas ol ON ol.id = le.linea_id
      WHERE ${condiciones.join(' AND ')}
        AND p.codigo IN ('DISENADOR','NUMERADOR','PRENCISTA','ENCUADERNADOR')
      GROUP BY u.id
      ORDER BY etapas_marcadas DESC`,
    valores
  );
  return filas;
}

/** Producción por tipo de trabajo. */
export async function porTipoTrabajo(filtros: RangoFechas) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.desde) {
    condiciones.push('o.fecha_ingreso >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('o.fecha_ingreso <= ?');
    valores.push(filtros.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT tt.nombre AS tipo_trabajo,
            COUNT(ol.id) AS trabajos,
            SUM(ol.cantidad) AS unidades,
            SUM(ol.finalizada = 1) AS finalizados,
            SUM(ol.finalizada = 0) AS en_proceso,
            ROUND(AVG(DATEDIFF(ol.fecha_entrega, o.fecha_ingreso)), 1) AS dias_promedio
       FROM orden_lineas ol
       JOIN ordenes o ON o.id = ol.orden_id
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
       ${where}
      GROUP BY tt.id
      ORDER BY trabajos DESC`,
    valores
  );
  return filas;
}

/** Producción por vendedor. */
export async function porVendedor(filtros: RangoFechas) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.desde) {
    condiciones.push('o.fecha_ingreso >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('o.fecha_ingreso <= ?');
    valores.push(filtros.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT u.nombre_completo AS vendedor,
            COUNT(DISTINCT o.id) AS ordenes,
            COUNT(DISTINCT o.cliente_id) AS clientes,
            SUM(o.estado = 'ABIERTA') AS abiertas,
            SUM(o.estado IN ('FINALIZADA','ENTREGADA')) AS cerradas
       FROM ordenes o
       JOIN usuarios u ON u.id = o.vendedor_id
       ${where}
      GROUP BY u.id
      ORDER BY ordenes DESC`,
    valores
  );
  return filas;
}

/** Trabajos sin movimiento: alimenta el aviso de órdenes estancadas. */
export async function estancadas(dias = 7) {
  const [filas] = await pool.query(
    `SELECT v.*, DATEDIFF(NOW(), v.ultimo_cambio_etapa) AS dias_sin_movimiento
       FROM v_ordenes_dashboard v
      WHERE v.finalizada = 0
        AND v.ultimo_cambio_etapa < NOW() - INTERVAL ? DAY
      ORDER BY v.ultimo_cambio_etapa`,
    [dias]
  );
  return filas;
}