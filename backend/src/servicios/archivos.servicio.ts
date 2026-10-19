import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/**
 * Dónde quedan las muestras.
 *
 * En desarrollo el servidor corre desde backend/, así que la carpeta del
 * proyecto queda un nivel arriba. Dentro de Docker el servidor corre desde
 * /app y ese "un nivel arriba" daba /almacen, que no es el disco montado
 * sino la capa de escritura del contenedor: las fotos se borraban en cada
 * reconstruccion. Por eso la ruta se fija con CARPETA_ALMACEN, que en
 * docker-compose apunta al volumen /app/almacen.
 */
const CARPETA_ALMACEN =
  process.env.CARPETA_ALMACEN?.trim() || path.resolve(process.cwd(), '../almacen');

export const CARPETA_SUBIDAS = path.resolve(CARPETA_ALMACEN, 'muestras');

export async function prepararCarpeta() {
  await fs.mkdir(CARPETA_SUBIDAS, { recursive: true });
  console.log(`Muestras guardadas en ${CARPETA_SUBIDAS}`);
}

/** Avisa claro cuando la foto quedó registrada pero el archivo ya no está. */
export async function existeEnDisco(ruta: string) {
  try {
    await fs.access(path.join(CARPETA_SUBIDAS, ruta));
    return true;
  } catch {
    return false;
  }
}

export async function registrar(datos: {
  lineaId: number;
  nombreArchivo: string;
  ruta: string;
  mime: string;
  bytes: number;
  subidoPor: number;
}) {
  const [linea] = await pool.query(
    `SELECT ol.id FROM orden_lineas ol WHERE ol.id = ?`,
    [datos.lineaId]
  );
  if (!(linea as any[])[0]) throw new ErrorHttp(404, 'Línea de orden no encontrada');

  // Antes se rechazaba la muestra cuando el trabajo iba marcado como
  // "Archivo sin cambios". Son justo los trabajos de archivo los que se
  // adjuntaban en papel, asi que ahora si se les puede subir la foto.

  const [resultado] = await pool.query(
    `INSERT INTO linea_archivos (linea_id, nombre_archivo, ruta, mime, bytes, subido_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.lineaId, datos.nombreArchivo, datos.ruta, datos.mime, datos.bytes, datos.subidoPor]
  );
  return { id: (resultado as any).insertId, ...datos };
}

export async function listar(lineaId: number) {
  const [filas] = await pool.query(
    `SELECT la.id, la.nombre_archivo, la.ruta, la.mime, la.bytes, la.subido_en,
            u.nombre_completo AS subido_por
       FROM linea_archivos la
       JOIN usuarios u ON u.id = la.subido_por
      WHERE la.linea_id = ?
      ORDER BY la.subido_en DESC`,
    [lineaId]
  );
  return filas;
}

export async function obtenerRuta(id: number) {
  const [filas] = await pool.query(
    `SELECT ruta, nombre_archivo, mime FROM linea_archivos WHERE id = ?`,
    [id]
  );
  const archivo = (filas as any[])[0];
  if (!archivo) throw new ErrorHttp(404, 'Archivo no encontrado');
  return archivo;
}

// ---------------------------------------------------------------- Banco

/**
 * Banco de muestras del cliente: la última foto de cada trabajo que se le
 * ha hecho. Así, al ingresar una orden, en vez de volver a sacar la foto
 * de la computadora se escoge la que ya subió el diseñador.
 *
 * Los trabajos se agrupan por nombre, que es como el cliente los pide
 * ("Factura timbrada"), y de cada uno queda la versión más reciente.
 */
export async function muestrasDeCliente(clienteId: number, limite = 60) {
  const [filas] = await pool.query(
    `SELECT la.id, la.nombre_archivo, la.mime, la.bytes, la.subido_en,
            u.nombre_completo AS subido_por,
            ol.id AS linea_id, ol.nombre_trabajo,
            tt.nombre AS tipo_trabajo, tt.codigo AS tipo_codigo,
            o.numero_orden, o.fecha_ingreso,
            (SELECT COUNT(*)
               FROM linea_archivos v
               JOIN orden_lineas ov ON ov.id = v.linea_id
               JOIN ordenes oo ON oo.id = ov.orden_id
              WHERE oo.cliente_id = ? AND ov.nombre_trabajo = ol.nombre_trabajo
            ) AS versiones
       FROM linea_archivos la
       JOIN orden_lineas ol ON ol.id = la.linea_id
       JOIN ordenes o ON o.id = ol.orden_id
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
       JOIN usuarios u ON u.id = la.subido_por
      WHERE o.cliente_id = ?
        AND la.id = (
          SELECT MAX(u2.id)
            FROM linea_archivos u2
            JOIN orden_lineas ol2 ON ol2.id = u2.linea_id
            JOIN ordenes o2 ON o2.id = ol2.orden_id
           WHERE o2.cliente_id = o.cliente_id
             AND ol2.nombre_trabajo = ol.nombre_trabajo
        )
      ORDER BY la.subido_en DESC
      LIMIT ?`,
    [clienteId, clienteId, limite]
  );
  return filas;
}

/**
 * Engancha una muestra que ya existe a un trabajo nuevo. El archivo se
 * copia en vez de compartirse, para que cada orden conserve su foto tal
 * como se aprobó aunque después se cambie la del banco.
 */
export async function copiarMuestra(archivoId: number, lineaId: number, usuarioId: number) {
  const [destino] = await pool.query(`SELECT id FROM orden_lineas WHERE id = ?`, [lineaId]);
  if (!(destino as any[])[0]) throw new ErrorHttp(404, 'Línea de orden no encontrada');

  const [filas] = await pool.query(
    `SELECT nombre_archivo, ruta, mime, bytes FROM linea_archivos WHERE id = ?`,
    [archivoId]
  );
  const origen = (filas as any[])[0];
  if (!origen) throw new ErrorHttp(404, 'La muestra que escogió ya no existe');
  if (!(await existeEnDisco(origen.ruta))) {
    throw new ErrorHttp(404, 'La muestra quedó registrada pero el archivo ya no está en el servidor');
  }

  const extension = path.extname(origen.ruta).toLowerCase();
  const nombre = `${Date.now()}-${Math.random().toString(16).slice(2, 14)}${extension}`;
  await fs.copyFile(
    path.join(CARPETA_SUBIDAS, origen.ruta),
    path.join(CARPETA_SUBIDAS, nombre)
  );

  return registrar({
    lineaId,
    nombreArchivo: origen.nombre_archivo,
    ruta: nombre,
    mime: origen.mime,
    bytes: origen.bytes,
    subidoPor: usuarioId,
  });
}