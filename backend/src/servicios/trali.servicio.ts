import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export interface DatosEncomienda {
  fecha: string;
  direccion: 'ENVIADA' | 'RECIBIDA';
  numeroGuia?: string | null;
  status?: 'CONTADO' | 'POR_COBRAR' | null;
  monto?: number | null;
  personaEnvia?: string | null;
  personaRecibe?: string | null;
  destino?: string | null;
  retiradoPor?: string | null;
  notas?: string | null;
}

export async function listar(filtros: {
  direccion?: 'ENVIADA' | 'RECIBIDA';
  desde?: string;
  hasta?: string;
  busqueda?: string;
  incluirEntregadas?: boolean;
}) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.direccion) {
    condiciones.push('e.direccion = ?');
    valores.push(filtros.direccion);
  }
  // Las recibidas son una bandeja de pendientes: las entregadas salen de la lista.
  if (filtros.direccion === 'RECIBIDA' && !filtros.incluirEntregadas) {
    condiciones.push('e.entregada_en IS NULL');
  }
  if (filtros.desde) {
    condiciones.push('e.fecha >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('e.fecha <= ?');
    valores.push(filtros.hasta);
  }
  if (filtros.busqueda) {
    condiciones.push(
      '(e.numero_guia LIKE ? OR e.persona_envia LIKE ? OR e.persona_recibe LIKE ? OR e.destino LIKE ?)'
    );
    const patron = `%${filtros.busqueda}%`;
    valores.push(patron, patron, patron, patron);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
      `SELECT e.id, e.fecha, e.direccion, e.numero_guia, e.status, e.monto,
            e.persona_envia, e.persona_recibe, e.destino, e.retirado_por, e.notas,
            e.entregada_en, en.nombre_completo AS entregada_por,
            e.creado_en, u.nombre_completo AS registrado_por
       FROM encomiendas e
       JOIN usuarios u ON u.id = e.registrado_por
       LEFT JOIN usuarios en ON en.id = e.entregada_por
       ${where}
      ORDER BY e.fecha DESC, e.id DESC
      LIMIT 500`,
    valores
  );
  return filas;
}

/** Totales del período: cuántas y cuánto queda por cobrar. */
export async function resumen(filtros: { desde?: string; hasta?: string }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.desde) {
    condiciones.push('fecha >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('fecha <= ?');
    valores.push(filtros.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT direccion,
            COUNT(*) AS total,
            COALESCE(SUM(monto), 0) AS monto_total,
            COALESCE(SUM(CASE WHEN status = 'POR_COBRAR' THEN monto ELSE 0 END), 0) AS por_cobrar
       FROM encomiendas
       ${where}
      GROUP BY direccion`,
    valores
  );
  return filas;
}

export async function crear(datos: DatosEncomienda, usuarioId: number) {
  const [resultado] = await pool.query(
    `INSERT INTO encomiendas
       (fecha, direccion, numero_guia, status, monto, persona_envia,
        persona_recibe, destino, retirado_por, notas, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.fecha,
      datos.direccion,
      datos.numeroGuia?.trim() || null,
      datos.status ?? null,
      datos.monto ?? null,
      datos.personaEnvia?.trim() || null,
      datos.personaRecibe?.trim() || null,
      datos.destino?.trim() || null,
      datos.retiradoPor?.trim() || null,
      datos.notas?.trim() || null,
    ].concat([usuarioId as any])
  );
  return { id: (resultado as any).insertId };
}

export async function actualizar(id: number, datos: Partial<DatosEncomienda>) {
  const [existe] = await pool.query(`SELECT id FROM encomiendas WHERE id = ?`, [id]);
  if (!(existe as any[]).length) throw new ErrorHttp(404, 'Encomienda no encontrada');

  await pool.query(
    `UPDATE encomiendas
        SET fecha          = COALESCE(?, fecha),
            numero_guia    = COALESCE(?, numero_guia),
            status         = COALESCE(?, status),
            monto          = COALESCE(?, monto),
            persona_envia  = COALESCE(?, persona_envia),
            persona_recibe = COALESCE(?, persona_recibe),
            destino        = COALESCE(?, destino),
            retirado_por   = COALESCE(?, retirado_por),
            notas          = COALESCE(?, notas)
      WHERE id = ?`,
    [
      datos.fecha ?? null,
      datos.numeroGuia ?? null,
      datos.status ?? null,
      datos.monto ?? null,
      datos.personaEnvia ?? null,
      datos.personaRecibe ?? null,
      datos.destino ?? null,
      datos.retiradoPor ?? null,
      datos.notas ?? null,
      id,
    ]
  );
  return { mensaje: 'Encomienda actualizada' };
}

export async function eliminar(id: number) {
  const [res] = await pool.query(`DELETE FROM encomiendas WHERE id = ?`, [id]);
  if ((res as any).affectedRows === 0) throw new ErrorHttp(404, 'Encomienda no encontrada');
  return { mensaje: 'Encomienda eliminada' };
}

/** Marca una encomienda recibida como entregada a su destinatario. */
export async function entregar(id: number, usuarioId: number, retiradoPor?: string | null) {
  const [filas] = await pool.query(
    `SELECT id, direccion, entregada_en FROM encomiendas WHERE id = ?`,
    [id]
  );
  const encomienda = (filas as any[])[0];
  if (!encomienda) throw new ErrorHttp(404, 'Encomienda no encontrada');
  if (encomienda.direccion !== 'RECIBIDA') {
    throw new ErrorHttp(400, 'Solo las encomiendas recibidas se marcan como entregadas');
  }
  if (encomienda.entregada_en) {
    throw new ErrorHttp(400, 'Esa encomienda ya estaba entregada');
  }

  await pool.query(
    `UPDATE encomiendas
        SET entregada_en = NOW(), entregada_por = ?,
            retirado_por = COALESCE(?, retirado_por)
      WHERE id = ?`,
    [usuarioId, retiradoPor?.trim() || null, id]
  );
  return { mensaje: 'Encomienda entregada' };
}