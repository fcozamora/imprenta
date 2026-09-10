import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export interface DatosCliente {
  cedula: string;
  nombre: string;
  nombreComercial?: string | null;
  telefono: string;
  telefonoWa?: string | null;
  emailFacturacion?: string | null;
  notas?: string | null;
}

/**
 * Normaliza un teléfono de Costa Rica al formato que usa WhatsApp:
 * 8888-7777 -> 50688887777
 */
export function normalizarWhatsapp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 8) return `506${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('506')) return digitos;
  if (digitos.length >= 10) return digitos;
  return null;
}

/** Búsqueda para el autorrelleno: cédula exacta. */
export async function porCedula(cedula: string) {
  const [filas] = await pool.query(
    `SELECT id, cedula, nombre, nombre_comercial, telefono, telefono_wa,
            email_facturacion, notas
       FROM clientes
      WHERE cedula = ? AND activo = 1`,
    [cedula]
  );
  return (filas as any[])[0] ?? null;
}

/**
 * Búsqueda general por cédula, nombre, nombre comercial o teléfono.
 * Los resultados salen del más reciente al más antiguo según su última orden.
 */
export async function buscar(termino: string, limite = 20) {
  const patron = `%${termino}%`;
  const [filas] = await pool.query(
    `SELECT c.id, c.cedula, c.nombre, c.nombre_comercial, c.telefono,
            c.telefono_wa, c.email_facturacion,
            COUNT(o.id) AS total_ordenes,
            MAX(o.fecha_ingreso) AS ultima_orden
       FROM clientes c
       LEFT JOIN ordenes o ON o.cliente_id = c.id
      WHERE c.activo = 1
        AND (c.cedula LIKE ? OR c.nombre LIKE ?
             OR c.nombre_comercial LIKE ? OR c.telefono LIKE ?)
      GROUP BY c.id
      ORDER BY ultima_orden DESC, c.nombre
      LIMIT ?`,
    [patron, patron, patron, patron, limite]
  );
  return filas;
}

export async function obtener(id: number) {
  const [filas] = await pool.query(
    `SELECT id, cedula, nombre, nombre_comercial, telefono, telefono_wa,
            email_facturacion, notas, creado_en
       FROM clientes WHERE id = ?`,
    [id]
  );
  const cliente = (filas as any[])[0];
  if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');
  return cliente;
}

/** Los "Productos" del cliente: todo lo que se le ha trabajado. */
export async function productos(clienteId: number) {
  const [filas] = await pool.query(
    `SELECT pc.id, pc.nombre_trabajo, tt.nombre AS tipo_trabajo,
            pc.veces_solicitado, pc.primera_fecha, pc.ultima_fecha,
            pc.perfil_impresion, o.numero_orden AS ultima_orden
       FROM productos_cliente pc
       JOIN tipos_trabajo tt ON tt.id = pc.tipo_trabajo_id
       LEFT JOIN ordenes o ON o.id = pc.ultima_orden_id
      WHERE pc.cliente_id = ?
      ORDER BY pc.ultima_fecha DESC, pc.nombre_trabajo`,
    [clienteId]
  );
  return filas;
}

/** Historial de órdenes del cliente, de la más nueva a la más vieja. */
export async function ordenes(clienteId: number, limite = 50) {
  const [filas] = await pool.query(
    `SELECT o.id, o.numero_orden, o.fecha_ingreso, o.fecha_entrega, o.estado,
            u.nombre_completo AS vendedor,
            GROUP_CONCAT(DISTINCT tt.nombre ORDER BY tt.nombre) AS tipos_trabajo,
            COUNT(ol.id) AS lineas
       FROM ordenes o
       JOIN usuarios u ON u.id = o.vendedor_id
       LEFT JOIN orden_lineas ol ON ol.orden_id = o.id
       LEFT JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
      WHERE o.cliente_id = ?
      GROUP BY o.id
      ORDER BY o.fecha_ingreso DESC, o.numero_orden DESC
      LIMIT ?`,
    [clienteId, limite]
  );
  return filas;
}

export async function crear(datos: DatosCliente, creadoPor: number) {
  const existente = await porCedula(datos.cedula);
  if (existente) throw new ErrorHttp(409, 'Ya existe un cliente con esa cédula');

  const wa = datos.telefonoWa ?? normalizarWhatsapp(datos.telefono);

  const [resultado] = await pool.query(
    `INSERT INTO clientes
       (cedula, nombre, nombre_comercial, telefono, telefono_wa,
        email_facturacion, notas, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.cedula,
      datos.nombre,
      datos.nombreComercial ?? null,
      datos.telefono,
      wa,
      datos.emailFacturacion ?? null,
      datos.notas ?? null,
      creadoPor,
    ]
  );
  return obtener((resultado as any).insertId);
}

export async function actualizar(id: number, datos: Partial<DatosCliente>, hechoPor: number) {
  const antes = await obtener(id);

  if (datos.cedula && datos.cedula !== antes.cedula) {
    const [existe] = await pool.query(`SELECT id FROM clientes WHERE cedula = ? AND id <> ?`, [
      datos.cedula,
      id,
    ]);
    if ((existe as any[]).length) throw new ErrorHttp(409, 'Ya existe otro cliente con esa cédula');
  }

  // Si cambia el teléfono y no mandaron uno de WhatsApp, se recalcula.
  const wa =
    datos.telefonoWa ?? (datos.telefono ? normalizarWhatsapp(datos.telefono) : null);

  await pool.query(
    `UPDATE clientes
        SET cedula = COALESCE(?, cedula),
            nombre = COALESCE(?, nombre),
            nombre_comercial = COALESCE(?, nombre_comercial),
            telefono = COALESCE(?, telefono),
            telefono_wa = COALESCE(?, telefono_wa),
            email_facturacion = COALESCE(?, email_facturacion),
            notas = COALESCE(?, notas)
      WHERE id = ?`,
    [
      datos.cedula ?? null,
      datos.nombre ?? null,
      datos.nombreComercial ?? null,
      datos.telefono ?? null,
      wa,
      datos.emailFacturacion ?? null,
      datos.notas ?? null,
      id,
    ]
  );

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes)
     VALUES ('clientes', ?, 'UPDATE', ?, JSON_OBJECT('cedula', ?, 'telefono', ?))`,
    [id, hechoPor, antes.cedula, antes.telefono]
  );

  return obtener(id);
}