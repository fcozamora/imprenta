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
    `SELECT ol.id, ol.archivo_sin_cambios FROM orden_lineas ol WHERE ol.id = ?`,
    [datos.lineaId]
  );
  const fila = (linea as any[])[0];
  if (!fila) throw new ErrorHttp(404, 'Línea de orden no encontrada');

  // El documento indica omitir el archivo cuando el trabajo no tuvo cambios.
  if (fila.archivo_sin_cambios) {
    throw new ErrorHttp(400, 'Este trabajo está marcado como "Archivo sin cambios"');
  }

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