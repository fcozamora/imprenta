import { pool } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

export const CATEGORIAS = ['BOND', 'BRISTOL', 'QUIMICO', 'ESPECIAL'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const VARIANTES = ['INTERMEDIO', 'FINAL'] as const;
export type Variante = (typeof VARIANTES)[number];

/**
 * Un papel puede llevar su existencia partida en dos variantes,
 * intermedio y final. En ese caso el color queda como el renglon padre
 * —es el que se escoge al crear la orden— y las resmas viven en las dos
 * variantes. Al crear la orden solo se ofrecen los padres, asi que ahi
 * se sigue viendo "Quimico Rosado" sin distinguir cual se uso.
 */
export async function listar(soloActivos = false) {
  const [filas] = await pool.query(
    `SELECT p.id, p.nombre, p.categoria, p.es_original, p.activo,
            p.padre_id, p.variante, p.resmas, p.minimo, p.actualizado_en,
            pa.nombre AS padre_nombre,
            (SELECT COUNT(*) FROM tipos_papel h WHERE h.padre_id = p.id) AS variantes,
            COALESCE(
              (SELECT SUM(h.resmas) FROM tipos_papel h WHERE h.padre_id = p.id), 0
            ) AS resmas_variantes,
            (p.minimo > 0 AND p.resmas <= p.minimo) AS bajo_minimo,
            (SELECT COUNT(*) FROM talonario_copias tc WHERE tc.papel_id = p.id) AS usos
       FROM tipos_papel p
       LEFT JOIN tipos_papel pa ON pa.id = p.padre_id
      ${soloActivos ? 'WHERE p.activo = 1' : ''}
      ORDER BY FIELD(COALESCE(pa.categoria, p.categoria),
                     'QUIMICO', 'BOND', 'BRISTOL', 'ESPECIAL'),
               COALESCE(pa.nombre, p.nombre),
               p.padre_id IS NOT NULL,
               FIELD(p.variante, 'INTERMEDIO', 'FINAL')`
  );
  return filas;
}

async function porId(id: number) {
  const [filas] = await pool.query(
    `SELECT p.id, p.nombre, p.categoria, p.es_original, p.activo,
            p.padre_id, p.variante, p.resmas, p.minimo,
            (SELECT COUNT(*) FROM tipos_papel h WHERE h.padre_id = p.id) AS variantes
       FROM tipos_papel p WHERE p.id = ?`,
    [id]
  );
  return (filas as any[])[0] as
    | {
        id: number;
        nombre: string;
        categoria: Categoria;
        es_original: number;
        activo: number;
        padre_id: number | null;
        variante: Variante | null;
        resmas: number;
        minimo: number;
        variantes: number;
      }
    | undefined;
}

async function exigirNombreLibre(nombre: string, exceptoId?: number) {
  const [otro] = await pool.query(
    `SELECT id FROM tipos_papel WHERE nombre = ?${exceptoId ? ' AND id <> ?' : ''}`,
    exceptoId ? [nombre, exceptoId] : [nombre]
  );
  if ((otro as any[]).length) throw new ErrorHttp(409, 'Ya existe un papel con ese nombre');
}

export async function crear(datos: {
  nombre: string;
  categoria: Categoria;
  esOriginal?: boolean;
  minimo?: number;
  padreId?: number | null;
  variante?: Variante | null;
}) {
  await exigirNombreLibre(datos.nombre);

  let padreId: number | null = null;
  let variante: Variante | null = null;

  if (datos.padreId) {
    const padre = await porId(datos.padreId);
    if (!padre) throw new ErrorHttp(404, 'El papel al que quiere agregar la variante no existe');
    if (padre.padre_id) throw new ErrorHttp(400, 'Una variante no puede tener variantes');
    if (!datos.variante) throw new ErrorHttp(400, 'Indique si es intermedio o final');
    const [ocupada] = await pool.query(
      `SELECT id FROM tipos_papel WHERE padre_id = ? AND variante = ?`,
      [datos.padreId, datos.variante]
    );
    if ((ocupada as any[]).length)
      throw new ErrorHttp(409, `Ese papel ya tiene la variante ${datos.variante.toLowerCase()}`);
    padreId = datos.padreId;
    variante = datos.variante;
  }

  // Solo un papel puede ser el original de los talonarios, y nunca una variante.
  const esOriginal = !padreId && datos.esOriginal === true;
  if (esOriginal) await pool.query(`UPDATE tipos_papel SET es_original = 0`);

  const [resultado] = await pool.query(
    `INSERT INTO tipos_papel (nombre, categoria, es_original, minimo, padre_id, variante)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      datos.nombre,
      padreId ? 'QUIMICO' : datos.categoria,
      esOriginal ? 1 : 0,
      datos.minimo ?? 0,
      padreId,
      variante,
    ]
  );
  return { id: (resultado as any).insertId, nombre: datos.nombre };
}

export async function actualizar(
  id: number,
  datos: {
    nombre?: string;
    categoria?: Categoria;
    esOriginal?: boolean;
    activo?: boolean;
    minimo?: number;
  }
) {
  const papel = await porId(id);
  if (!papel) throw new ErrorHttp(404, 'Papel no encontrado');

  if (datos.nombre && datos.nombre !== papel.nombre) await exigirNombreLibre(datos.nombre, id);

  if (datos.esOriginal && papel.padre_id) {
    throw new ErrorHttp(400, 'Una variante no puede ser el papel del original');
  }
  if (datos.esOriginal) {
    await pool.query(`UPDATE tipos_papel SET es_original = 0 WHERE id <> ?`, [id]);
  }

  // Desactivar el papel original dejaría los talonarios sin original.
  if (datos.activo === false && papel.es_original) {
    throw new ErrorHttp(400, 'No puede desactivar el papel marcado como original');
  }

  // Cambiar de categoría una variante la saca de los químicos sin sentido.
  const categoria = papel.padre_id ? undefined : datos.categoria;

  await pool.query(
    `UPDATE tipos_papel
        SET nombre = COALESCE(?, nombre),
            categoria = COALESCE(?, categoria),
            es_original = COALESCE(?, es_original),
            minimo = COALESCE(?, minimo),
            activo = COALESCE(?, activo)
      WHERE id = ?`,
    [
      datos.nombre ?? null,
      categoria ?? null,
      datos.esOriginal === undefined ? null : datos.esOriginal ? 1 : 0,
      datos.minimo ?? null,
      datos.activo === undefined ? null : datos.activo ? 1 : 0,
      id,
    ]
  );

  if (datos.activo !== undefined) {
    // Desactivar el color arrastra sus variantes: no tiene sentido dejar un
    // intermedio vivo si el color ya no se usa.
    if (!papel.padre_id && papel.variantes > 0) {
      await pool.query(`UPDATE tipos_papel SET activo = ? WHERE padre_id = ?`, [
        datos.activo ? 1 : 0,
        id,
      ]);
    }

    // Al revés, el color se ofrece en la orden mientras le quede al menos
    // una variante activa.
    if (papel.padre_id) {
      await pool.query(
        `UPDATE tipos_papel p
            SET p.activo = (
              SELECT MAX(h.activo) FROM (SELECT padre_id, activo FROM tipos_papel) h
               WHERE h.padre_id = p.id
            )
          WHERE p.id = ?`,
        [papel.padre_id]
      );
    }
  }

  return { mensaje: 'Papel actualizado' };
}

/**
 * Parte un color de químico en intermedio y final. La existencia que
 * tenía anotada el color pasa a la variante final, que es la de los
 * talonarios de dos hojas, y queda registrada en el historial.
 */
export async function separar(id: number, usuarioId: number) {
  const papel = await porId(id);
  if (!papel) throw new ErrorHttp(404, 'Papel no encontrado');
  if (papel.padre_id) throw new ErrorHttp(400, 'Ese papel ya es una variante');
  if (papel.variantes > 0) throw new ErrorHttp(409, 'Ese papel ya está separado');
  if (papel.categoria !== 'QUIMICO') {
    throw new ErrorHttp(400, 'Solo los papeles químicos se separan en intermedio y final');
  }
  if (papel.es_original) {
    throw new ErrorHttp(400, 'El papel del original no se separa: siempre va en la primera hoja');
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const nuevas: number[] = [];
    for (const variante of VARIANTES) {
      const nombre = `${papel.nombre} ${variante === 'INTERMEDIO' ? 'Intermedio' : 'Final'}`;
      const [existe] = await conexion.query(`SELECT id FROM tipos_papel WHERE nombre = ?`, [
        nombre,
      ]);
      if ((existe as any[]).length) {
        throw new ErrorHttp(409, `Ya existe un papel llamado "${nombre}"`);
      }
      const [r] = await conexion.query(
        `INSERT INTO tipos_papel
               (nombre, categoria, padre_id, variante, activo, es_original, resmas, minimo)
         VALUES (?, 'QUIMICO', ?, ?, ?, 0, 0, ?)`,
        [nombre, id, variante, papel.activo, papel.minimo]
      );
      nuevas.push((r as any).insertId);
    }

    // La existencia del color se traslada a la variante final.
    if (papel.resmas > 0) {
      const finalId = nuevas[1];
      await conexion.query(`UPDATE tipos_papel SET resmas = ? WHERE id = ?`, [
        papel.resmas,
        finalId,
      ]);
      await conexion.query(
        `INSERT INTO papeles_movimientos
               (papel_id, tipo, cantidad, saldo_anterior, saldo_nuevo, motivo, usuario_id)
         VALUES (?, 'AJUSTE', ?, 0, ?, ?, ?)`,
        [
          finalId,
          papel.resmas,
          papel.resmas,
          'Traslado de existencia al separar intermedio y final',
          usuarioId,
        ]
      );
    }

    await conexion.query(`UPDATE tipos_papel SET resmas = 0, minimo = 0 WHERE id = ?`, [id]);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  return { mensaje: `${papel.nombre} quedó separado en intermedio y final` };
}

/** Movimiento de existencias: el procedimiento guarda el saldo antes y después. */
export async function mover(
  papelId: number,
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
  cantidad: number,
  usuarioId: number,
  motivo?: string
) {
  const papel = await porId(papelId);
  if (!papel) throw new ErrorHttp(404, 'Papel no encontrado');
  if (papel.variantes > 0) {
    throw new ErrorHttp(
      400,
      'Ese color lleva la existencia separada: registre el movimiento en el intermedio o en el final'
    );
  }

  try {
    await pool.query(`CALL sp_mover_papel(?, ?, ?, ?, ?)`, [
      papelId,
      tipo,
      cantidad,
      usuarioId,
      motivo?.trim() || null,
    ]);
  } catch (error: any) {
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }

  const [filas] = await pool.query(`SELECT id, nombre, resmas FROM tipos_papel WHERE id = ?`, [
    papelId,
  ]);
  return (filas as any[])[0];
}

export async function movimientos(papelId: number, limite = 50) {
  const [filas] = await pool.query(
    `SELECT m.tipo, m.cantidad, m.saldo_anterior, m.saldo_nuevo,
            m.motivo, m.creado_en, u.nombre_completo AS usuario
       FROM papeles_movimientos m
       JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.papel_id = ?
      ORDER BY m.creado_en DESC
      LIMIT ?`,
    [papelId, limite]
  );
  return filas;
}
