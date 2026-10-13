import { enTransaccion, pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export interface LineaPedido {
  descripcion: string;
  /** Cantidades por id de talla: { "3": 2, "7": 5 } */
  cantidades: Record<string, number>;
}

export async function crear(
  usuarioId: number,
  datos: { fechaRequerida: string; clienteId?: number | null; nota?: string | null; lineas: LineaPedido[] }
) {
  // Solo entran las líneas con descripción y al menos una prenda.
  const utiles = datos.lineas.filter(
    (l) => l.descripcion?.trim() && Object.values(l.cantidades).some((c) => c > 0)
  );
  if (!utiles.length) {
    throw new ErrorHttp(400, 'Agregue al menos una línea con descripción y cantidades');
  }

  return enTransaccion(async (cx) => {
    // El trigger de esta tabla genera la notificación al administrador.
    const [resultado] = await cx.query(
      `INSERT INTO pedidos_camiseta (usuario_id, cliente_id, fecha_requerida, nota)
       VALUES (?, ?, ?, ?)`,
      [usuarioId, datos.clienteId ?? null, datos.fechaRequerida, datos.nota?.trim() || null]
    );
    const pedidoId = (resultado as any).insertId;

    for (const [i, linea] of utiles.entries()) {
      const [res] = await cx.query(
        `INSERT INTO pedido_camiseta_lineas (pedido_id, linea, descripcion)
         VALUES (?, ?, ?)`,
        [pedidoId, i + 1, linea.descripcion.trim()]
      );
      const lineaId = (res as any).insertId;

      const valores = Object.entries(linea.cantidades)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([tallaId, cantidad]) => [lineaId, Number(tallaId), cantidad]);

      if (valores.length) {
        await cx.query(
          `INSERT INTO pedido_camiseta_cantidades (linea_id, talla_id, cantidad) VALUES ?`,
          [valores]
        );
      }
    }

    return { id: pedidoId, lineas: utiles.length };
  });
}

export async function listar(filtros: { estado?: string; usuarioId?: number }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.estado) {
    condiciones.push('p.estado = ?');
    valores.push(filtros.estado);
  }
  if (filtros.usuarioId) {
    condiciones.push('p.usuario_id = ?');
    valores.push(filtros.usuarioId);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT p.id, p.estado, p.nota, p.fecha_requerida, p.creado_en, p.atendido_en,
            u.nombre_completo AS solicitante, pu.nombre AS puesto,
            a.nombre_completo AS atendido_por,
            c.nombre AS cliente,
            COUNT(DISTINCT l.id) AS total_lineas,
            COALESCE(SUM(q.cantidad), 0) AS total_prendas
       FROM pedidos_camiseta p
       JOIN usuarios u  ON u.id  = p.usuario_id
       JOIN puestos  pu ON pu.id = u.puesto_id
       LEFT JOIN usuarios a ON a.id = p.atendido_por
       LEFT JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN pedido_camiseta_lineas l ON l.pedido_id = p.id
       LEFT JOIN pedido_camiseta_cantidades q ON q.linea_id = l.id
       ${where}
      GROUP BY p.id
      ORDER BY p.estado = 'PENDIENTE' DESC, p.fecha_requerida, p.creado_en DESC
      LIMIT 200`,
    valores
  );
  return filas;
}

export async function obtener(id: number) {
  const [cabeceras] = await pool.query(
    `SELECT p.id, p.estado, p.nota, p.fecha_requerida, p.creado_en, p.atendido_en,
            u.nombre_completo AS solicitante, a.nombre_completo AS atendido_por,
            c.id AS cliente_id, c.nombre AS cliente
       FROM pedidos_camiseta p
       JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN usuarios a ON a.id = p.atendido_por
       LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = ?`,
    [id]
  );
  const pedido = (cabeceras as any[])[0];
  if (!pedido) throw new ErrorHttp(404, 'Pedido no encontrado');

  const [lineas] = await pool.query(
    `SELECT l.id, l.linea, l.descripcion
       FROM pedido_camiseta_lineas l
      WHERE l.pedido_id = ?
      ORDER BY l.linea`,
    [id]
  );

  const [cantidades] = await pool.query(
    `SELECT q.linea_id, q.talla_id, q.cantidad, t.genero, t.nombre AS talla
       FROM pedido_camiseta_cantidades q
       JOIN pedido_camiseta_lineas l ON l.id = q.linea_id
       JOIN tallas_camiseta t ON t.id = q.talla_id
      WHERE l.pedido_id = ?`,
    [id]
  );

  // Cada línea lleva sus cantidades como { tallaId: cantidad }
  for (const linea of lineas as any[]) {
    linea.cantidades = {} as Record<number, number>;
    for (const q of cantidades as any[]) {
      if (q.linea_id === linea.id) linea.cantidades[q.talla_id] = q.cantidad;
    }
  }

  return { ...pedido, lineas };
}

export async function cambiarEstado(
  id: number,
  estado: 'PENDIENTE' | 'APROBADO' | 'ENTREGADO' | 'RECHAZADO',
  usuarioId: number
) {
  await obtener(id);
  await pool.query(
    `UPDATE pedidos_camiseta
        SET estado = ?, atendido_por = ?, atendido_en = NOW()
      WHERE id = ?`,
    [estado, usuarioId, id]
  );
  return { mensaje: `Pedido marcado como ${estado.toLowerCase()}` };
}