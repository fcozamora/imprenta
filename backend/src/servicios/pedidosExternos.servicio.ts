import { z } from 'zod';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export const esquemaPedidoExterno = z.object({
  numero_orden: z.coerce.number().int().positive(),
  fecha_solicitud: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  pedido_solicitado: z.string().trim().min(1).max(120),
  cantidad: z.string().trim().min(1).max(60),
  descripcion: z.string().trim().max(200).optional().nullable(),
});

export type DatosPedidoExterno = z.infer<typeof esquemaPedidoExterno>;

const SELECT_BASE = `
  SELECT pe.id,
         pe.orden_id,
         o.numero_orden,
         c.nombre            AS cliente,
         pe.fecha_solicitud,
         pe.pedido_solicitado,
         pe.cantidad,
         pe.descripcion,
         pe.retirado,
         pe.retirado_en
  FROM pedidos_externos pe
  JOIN ordenes  o ON o.id = pe.orden_id
  JOIN clientes c ON c.id = o.cliente_id`;

async function buscarOrdenPorNumero(numero: number): Promise<number> {
  const [filas] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM ordenes WHERE numero_orden = ? LIMIT 1',
    [numero],
  );
  if (!filas.length) {
    throw new ErrorHttp(404, `No existe la orden ${numero}`);
  }
  return filas[0].id as number;
}

export async function listarPedidosExternos(opciones: {
  retirados?: boolean;
  busqueda?: string;
}) {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (!opciones.retirados) condiciones.push('pe.retirado = 0');

  const texto = (opciones.busqueda ?? '').trim();
  if (texto) {
    const like = `%${texto}%`;
    if (/^\d+$/.test(texto)) {
      condiciones.push('o.numero_orden = ?');
      valores.push(Number(texto));
    } else {
      condiciones.push(
        '(pe.pedido_solicitado LIKE ? OR pe.descripcion LIKE ? OR c.nombre LIKE ?)',
      );
      valores.push(like, like, like);
    }
  }

  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE}${where}
     ORDER BY pe.retirado ASC, pe.fecha_solicitud DESC, pe.id DESC
     LIMIT 300`,
    valores,
  );
  return filas;
}

export async function crearPedidoExterno(datos: DatosPedidoExterno, usuarioId: number) {
  const ordenId = await buscarOrdenPorNumero(datos.numero_orden);
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO pedidos_externos
       (orden_id, fecha_solicitud, pedido_solicitado, cantidad, descripcion, creado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ordenId,
      datos.fecha_solicitud,
      datos.pedido_solicitado,
      datos.cantidad,
      datos.descripcion || null,
      usuarioId,
    ],
  );
  return obtenerPedidoExterno(res.insertId);
}

export async function actualizarPedidoExterno(id: number, datos: DatosPedidoExterno) {
  const ordenId = await buscarOrdenPorNumero(datos.numero_orden);
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE pedidos_externos
        SET orden_id = ?, fecha_solicitud = ?, pedido_solicitado = ?,
            cantidad = ?, descripcion = ?
      WHERE id = ?`,
    [
      ordenId,
      datos.fecha_solicitud,
      datos.pedido_solicitado,
      datos.cantidad,
      datos.descripcion || null,
      id,
    ],
  );
  if (!res.affectedRows) throw new ErrorHttp(404, 'Pedido externo no encontrado');
  return obtenerPedidoExterno(id);
}

export async function marcarRetirado(id: number, retirado: boolean, usuarioId: number) {
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE pedidos_externos
        SET retirado = ?,
            retirado_en = ?,
            retirado_por = ?
      WHERE id = ?`,
    [retirado ? 1 : 0, retirado ? new Date() : null, retirado ? usuarioId : null, id],
  );
  if (!res.affectedRows) throw new ErrorHttp(404, 'Pedido externo no encontrado');
  return obtenerPedidoExterno(id);
}

export async function eliminarPedidoExterno(id: number) {
  const [res] = await pool.query<ResultSetHeader>(
    'DELETE FROM pedidos_externos WHERE id = ?',
    [id],
  );
  if (!res.affectedRows) throw new ErrorHttp(404, 'Pedido externo no encontrado');
}

export async function obtenerPedidoExterno(id: number) {
  const [filas] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE pe.id = ?`,
    [id],
  );
  if (!filas.length) throw new ErrorHttp(404, 'Pedido externo no encontrado');
  return filas[0];
}