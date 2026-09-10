import { pool } from '../db/pool.js';

/**
 * Mensajes pendientes de envío.
 * Por ahora el envío es manual: la interfaz abre wa.me con el texto listo.
 * Cuando contrates la API de WhatsApp Business, este servicio la llama aquí.
 */
export async function pendientes(limite = 50) {
  const [filas] = await pool.query(
    `SELECT w.id, w.telefono, w.plantilla, w.mensaje, w.creado_en,
            o.numero_orden, c.nombre AS cliente
       FROM whatsapp_cola w
       LEFT JOIN ordenes o ON o.id = w.orden_id
       LEFT JOIN clientes c ON c.id = o.cliente_id
      WHERE w.estado = 'PENDIENTE'
      ORDER BY w.creado_en
      LIMIT ?`,
    [limite]
  );

  // Enlace directo que abre WhatsApp con el mensaje precargado.
  return (filas as any[]).map((f) => ({
    ...f,
    enlace: `https://wa.me/${f.telefono}?text=${encodeURIComponent(f.mensaje)}`,
  }));
}

export async function marcarEnviado(id: number) {
  await pool.query(
    `UPDATE whatsapp_cola SET estado = 'ENVIADO', enviado_en = NOW() WHERE id = ?`,
    [id]
  );
  return { mensaje: 'Mensaje marcado como enviado' };
}

export async function marcarError(id: number, error: string) {
  await pool.query(
    `UPDATE whatsapp_cola
        SET estado = 'ERROR', intentos = intentos + 1, error = ?
      WHERE id = ?`,
    [error.slice(0, 255), id]
  );
  return { mensaje: 'Error registrado' };
}

export async function cancelar(id: number) {
  await pool.query(`UPDATE whatsapp_cola SET estado = 'CANCELADO' WHERE id = ?`, [id]);
  return { mensaje: 'Mensaje cancelado' };
}

/** Enlace de WhatsApp para un cliente, sin pasar por la cola. */
export function enlaceDirecto(telefono: string, mensaje?: string) {
  const base = `https://wa.me/${telefono.replace(/\D/g, '')}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}