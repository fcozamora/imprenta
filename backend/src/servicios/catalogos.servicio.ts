import { pool } from '../db/pool.js';

/** Todos los catálogos en una sola petición: el formulario los carga de una vez. */
export async function todos() {
  const [
    tiposTrabajo,
    etapas,
    flujos,
    papeles,
    tamanos,
    copias,
    sobres,
    materiales,
    telas,
    tintas,
    vendedores,
    costureras,
    tallas,
  ] = await Promise.all([
    pool.query(
      `SELECT id, codigo, nombre, dias_habiles_entrega, dias_alerta_previa, requiere_imagen
         FROM tipos_trabajo WHERE activo = 1 ORDER BY orden_visual`
    ),
    pool.query(`SELECT id, codigo, nombre, icono, color FROM etapas ORDER BY id`),
    pool.query(
      `SELECT tipo_trabajo_id, secuencia, etapa_id, omitir_sin_cambios
         FROM flujo_etapas ORDER BY tipo_trabajo_id, secuencia`
    ),
    pool.query(
      `SELECT id, nombre, categoria, es_original
         FROM tipos_papel WHERE activo = 1
        ORDER BY FIELD(categoria,'QUIMICO','BOND','BRISTOL','ESPECIAL'), nombre`
    ),
    pool.query(
      `SELECT id, nombre FROM tamanos_talonario WHERE activo = 1 ORDER BY orden_visual`
    ),
    pool.query(`SELECT id, nombre, cantidad_hojas FROM tipos_copia WHERE activo = 1 ORDER BY id`),
    pool.query(`SELECT id, nombre FROM tipos_sobre WHERE activo = 1 ORDER BY nombre`),
    pool.query(`SELECT id, nombre FROM materiales_latex WHERE activo = 1 ORDER BY nombre`),
    pool.query(`SELECT id, nombre FROM telas WHERE activo = 1 ORDER BY nombre`),
    pool.query(`SELECT id, nombre, hex FROM tintas WHERE activo = 1 ORDER BY nombre`),
    pool.query(
      // Cualquier usuario activo puede quedar como responsable de la orden,
      // menos la cuenta de administracion del sistema.
      `SELECT u.id, u.nombre_completo AS nombre
         FROM usuarios u
        WHERE u.activo = 1 AND u.cedula <> '000000000'
        ORDER BY u.apellido, u.nombre`
    ),
    pool.query(`SELECT id, nombre FROM costureras WHERE activo = 1 ORDER BY nombre`),
    pool.query(
      `SELECT id, genero, nombre FROM tallas_camiseta WHERE activo = 1
        ORDER BY genero DESC, orden_visual`
    ),
  ]);

  return {
    tiposTrabajo: tiposTrabajo[0],
    etapas: etapas[0],
    flujos: flujos[0],
    papeles: papeles[0],
    tamanosTalonario: tamanos[0],
    tiposCopia: copias[0],
    tiposSobre: sobres[0],
    materialesLatex: materiales[0],
    telas: telas[0],
    tintas: tintas[0],
    vendedores: vendedores[0],
    costureras: costureras[0], 
    tallas: tallas[0],
  };
}

/**
 * Etapas que recorrerá un tipo de trabajo, considerando "Archivo sin cambios".
 * Es lo que dibuja la barra de íconos.
 */
export async function flujoDe(tipoTrabajoId: number, archivoSinCambios: boolean) {
  const [filas] = await pool.query(
    `SELECT f.secuencia, e.id, e.codigo, e.nombre, e.icono, e.color
       FROM flujo_etapas f
       JOIN etapas e ON e.id = f.etapa_id
      WHERE f.tipo_trabajo_id = ?
        AND NOT (? = 1 AND f.omitir_sin_cambios = 1)
      ORDER BY f.secuencia`,
    [tipoTrabajoId, archivoSinCambios ? 1 : 0]
  );
  return filas;
}