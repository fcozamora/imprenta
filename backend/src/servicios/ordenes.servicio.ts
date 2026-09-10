import type { PoolConnection } from 'mysql2/promise';
import { pool, enTransaccion } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

// ---------------------------------------------------------------- Tipos

export interface LineaTalonario {
  cantidadBlocks: number;
  hojasPorBlock: number;
  tamanoId?: number | null;
  tamanoOtro?: string | null;
  tipoCopiaId: number;
  tinta: string;
  encolado?: boolean;
  perforado?: boolean;
  grapado?: boolean;
  numeracionInicial?: number | null;
  copias?: Array<{ posicion: number; rol: 'ORIGINAL' | 'INTERMEDIO' | 'FINAL'; papelId: number }>;
}

export interface LineaOrden {
  tipoTrabajoId: number;
  nombreTrabajo: string;
  cantidad: number;
  archivoSinCambios?: boolean;
  observaciones?: string | null;
  talonario?: LineaTalonario;
  sobre?: { tipoSobreId: number; tinta: string };
  latex?: { tamano: string; materialId: number };
  textil?: { telaId: number; perfilImpresion?: string | null; costureraId?: number | null };
  sello?: { codigoSello?: string | null; tintaId?: number | null };
}

export interface NuevaOrden {
  clienteId: number;
  vendedorId: number;
  fechaIngreso?: string | null;
  observaciones?: string | null;
  lineas: LineaOrden[];
}

// ---------------------------------------------------------------- Crear

/** Inserta el detalle específico según la categoría del trabajo. */
async function insertarDetalle(cx: PoolConnection, lineaId: number, linea: LineaOrden) {
  const [tipo] = await cx.query(`SELECT codigo FROM tipos_trabajo WHERE id = ?`, [
    linea.tipoTrabajoId,
  ]);
  const codigo = (tipo as any[])[0]?.codigo;

  switch (codigo) {
    case 'TALONARIOS': {
      const t = linea.talonario;
      if (!t) throw new ErrorHttp(400, 'Faltan los datos del talonario');
      if (!t.tamanoId && !t.tamanoOtro) {
        throw new ErrorHttp(400, 'Debe indicar el tamaño del talonario');
      }
      await cx.query(
        `INSERT INTO detalle_talonario
           (linea_id, cantidad_blocks, hojas_por_block, tamano_id, tamano_otro,
            tipo_copia_id, tinta, encolado, perforado, grapado, numeracion_inicial)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lineaId,
          t.cantidadBlocks,
          t.hojasPorBlock,
          t.tamanoId ?? null,
          t.tamanoOtro ?? null,
          t.tipoCopiaId,
          t.tinta,
          t.encolado ? 1 : 0,
          t.perforado ? 1 : 0,
          t.grapado ? 1 : 0,
          t.numeracionInicial ?? null,
        ]
      );
      if (t.copias?.length) {
        const valores = t.copias.map((c) => [lineaId, c.posicion, c.rol, c.papelId]);
        await cx.query(
          `INSERT INTO talonario_copias (linea_id, posicion, rol, papel_id) VALUES ?`,
          [valores]
        );
      }
      break;
    }

    case 'SOBRES': {
      const s = linea.sobre;
      if (!s) throw new ErrorHttp(400, 'Faltan los datos del sobre');
      await cx.query(
        `INSERT INTO detalle_sobre (linea_id, tipo_sobre_id, tinta) VALUES (?, ?, ?)`,
        [lineaId, s.tipoSobreId, s.tinta]
      );
      break;
    }

    case 'HP_LATEX':
    case 'IMPRESION_DIGITAL': {
      const l = linea.latex;
      if (!l) throw new ErrorHttp(400, 'Faltan el tamaño y el material');
      await cx.query(
        `INSERT INTO detalle_latex (linea_id, tamano, material_id) VALUES (?, ?, ?)`,
        [lineaId, l.tamano, l.materialId]
      );
      break;
    }

    case 'TEXTIL': {
      const t = linea.textil;
      if (!t) throw new ErrorHttp(400, 'Debe indicar el tipo de tela');
      await cx.query(
        `INSERT INTO detalle_textil (linea_id, tela_id, perfil_impresion, costurera_id)
         VALUES (?, ?, ?, ?)`,
        [lineaId, t.telaId, t.perfilImpresion ?? null, t.costureraId ?? null]
      );
      break;
    }

    case 'SELLOS': {
      const s = linea.sello;
      await cx.query(
        `INSERT INTO detalle_sello (linea_id, codigo_sello, tinta_id) VALUES (?, ?, ?)`,
        [lineaId, s?.codigoSello ?? null, s?.tintaId ?? null]
      );
      break;
    }

    // DTF y BORDADO solo usan los campos base de la línea.
  }
}

export async function crear(datos: NuevaOrden, creadoPor: number) {
  if (!datos.lineas?.length) {
    throw new ErrorHttp(400, 'La orden debe tener al menos un tipo de trabajo');
  }

  return enTransaccion(async (cx) => {
    // El número de orden y la fecha de ingreso los pone el trigger si van en NULL.
    const [resultado] = await cx.query(
      `INSERT INTO ordenes (numero_orden, cliente_id, vendedor_id, fecha_ingreso,
                            observaciones, creado_por)
       VALUES (0, ?, ?, ?, ?, ?)`,
      [
        datos.clienteId,
        datos.vendedorId,
        datos.fechaIngreso ?? null,
        datos.observaciones ?? null,
        creadoPor,
      ]
    );
    const ordenId = (resultado as any).insertId;

    for (const linea of datos.lineas) {
      const [res] = await cx.query(
        `INSERT INTO orden_lineas
           (orden_id, linea, tipo_trabajo_id, nombre_trabajo, cantidad,
            archivo_sin_cambios, observaciones)
         VALUES (?, 0, ?, ?, ?, ?, ?)`,
        [
          ordenId,
          linea.tipoTrabajoId,
          linea.nombreTrabajo,
          linea.cantidad,
          linea.archivoSinCambios ? 1 : 0,
          linea.observaciones ?? null,
        ]
      );
      const lineaId = (res as any).insertId;

      await insertarDetalle(cx, lineaId, linea);

      // Coloca la línea en su primera etapa (Diseño) y deja el registro.
      await cx.query(`CALL sp_avanzar_etapa(?, ?, NULL)`, [lineaId, creadoPor]);
    }

    const [orden] = await cx.query(
      `SELECT id, numero_orden, fecha_ingreso, fecha_entrega FROM ordenes WHERE id = ?`,
      [ordenId]
    );
    return (orden as any[])[0];
  });
}

// ---------------------------------------------------------------- Consultar

export async function obtener(id: number) {
  const [ordenes] = await pool.query(
    `SELECT o.id, o.numero_orden, o.fecha_ingreso, o.fecha_entrega, o.estado,
            o.observaciones, o.creado_en, o.finalizada_en,
            c.id AS cliente_id, c.cedula AS cliente_cedula, c.nombre AS cliente,
            c.nombre_comercial, c.telefono, c.telefono_wa, c.email_facturacion,
            o.vendedor_id, v.nombre_completo AS vendedor,
            r.nombre_completo AS registrada_por
       FROM ordenes o
       JOIN clientes c ON c.id = o.cliente_id
       JOIN usuarios v ON v.id = o.vendedor_id
       JOIN usuarios r ON r.id = o.creado_por
      WHERE o.id = ?`,
    [id]
  );
  const orden = (ordenes as any[])[0];
  if (!orden) throw new ErrorHttp(404, 'Orden no encontrada');

  const [lineas] = await pool.query(
    `SELECT ol.id, ol.linea, ol.tipo_trabajo_id, tt.codigo AS tipo_codigo,
            tt.nombre AS tipo_trabajo, ol.nombre_trabajo, ol.cantidad,
            ol.archivo_sin_cambios, ol.observaciones, ol.fecha_entrega,
            ol.etapa_actual_id, e.codigo AS etapa_codigo, e.nombre AS etapa,
            e.icono AS etapa_icono, e.color AS etapa_color, ol.secuencia_actual,
            ol.disenador_id, d.nombre_completo AS disenador, ol.tomada_en,
            ol.finalizada, ol.entregada, ol.ultimo_cambio_etapa
       FROM orden_lineas ol
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
       LEFT JOIN etapas e ON e.id = ol.etapa_actual_id
       LEFT JOIN usuarios d ON d.id = ol.disenador_id
      WHERE ol.orden_id = ?
      ORDER BY ol.linea`,
    [id]
  );

  // Detalle específico y flujo de etapas de cada línea
  for (const linea of lineas as any[]) {
    linea.flujo = await flujoDeLinea(linea.tipo_trabajo_id, !!linea.archivo_sin_cambios);
    linea.historial = await historialEtapas(linea.id);
    linea.detalle = await detalleDeLinea(linea.id, linea.tipo_codigo);
  }

  return { ...orden, lineas };
}

async function flujoDeLinea(tipoTrabajoId: number, sinCambios: boolean) {
  const [filas] = await pool.query(
    `SELECT f.secuencia, e.id, e.codigo, e.nombre, e.icono, e.color
       FROM flujo_etapas f
       JOIN etapas e ON e.id = f.etapa_id
      WHERE f.tipo_trabajo_id = ?
        AND NOT (? = 1 AND f.omitir_sin_cambios = 1)
      ORDER BY f.secuencia`,
    [tipoTrabajoId, sinCambios ? 1 : 0]
  );
  return filas;
}

async function historialEtapas(lineaId: number) {
  const [filas] = await pool.query(
    `SELECT le.etapa_id, e.codigo, e.nombre, le.marcada_en, le.minutos_en_etapa,
            u.nombre_completo AS usuario, p.nombre AS puesto
       FROM linea_etapas le
       JOIN etapas e ON e.id = le.etapa_id
       LEFT JOIN usuarios u ON u.id = le.usuario_id
       LEFT JOIN puestos p ON p.id = u.puesto_id
      WHERE le.linea_id = ?
      ORDER BY le.secuencia`,
    [lineaId]
  );
  return filas;
}

async function detalleDeLinea(lineaId: number, tipoCodigo: string) {
  switch (tipoCodigo) {
    case 'TALONARIOS': {
      const [d] = await pool.query(
        `SELECT dt.*, tam.nombre AS tamano, tc.nombre AS tipo_copia
           FROM detalle_talonario dt
           LEFT JOIN tamanos_talonario tam ON tam.id = dt.tamano_id
           JOIN tipos_copia tc ON tc.id = dt.tipo_copia_id
          WHERE dt.linea_id = ?`,
        [lineaId]
      );
      const detalle = (d as any[])[0];
      if (detalle) {
        const [copias] = await pool.query(
          `SELECT tcp.posicion, tcp.rol, tp.nombre AS papel
             FROM talonario_copias tcp
             JOIN tipos_papel tp ON tp.id = tcp.papel_id
            WHERE tcp.linea_id = ? ORDER BY tcp.posicion`,
          [lineaId]
        );
        detalle.copias = copias;
      }
      return detalle ?? null;
    }
    case 'SOBRES': {
      const [d] = await pool.query(
        `SELECT ds.tinta, ts.nombre AS tipo_sobre
           FROM detalle_sobre ds JOIN tipos_sobre ts ON ts.id = ds.tipo_sobre_id
          WHERE ds.linea_id = ?`,
        [lineaId]
      );
      return (d as any[])[0] ?? null;
    }
    case 'HP_LATEX':
    case 'IMPRESION_DIGITAL': {
      const [d] = await pool.query(
        `SELECT dl.tamano, ml.nombre AS material
           FROM detalle_latex dl JOIN materiales_latex ml ON ml.id = dl.material_id
          WHERE dl.linea_id = ?`,
        [lineaId]
      );
      return (d as any[])[0] ?? null;
    }
    case 'TEXTIL': {
      const [d] = await pool.query(
        `SELECT dt.perfil_impresion, t.nombre AS tela, c.nombre AS costurera
           FROM detalle_textil dt
           JOIN telas t ON t.id = dt.tela_id
           LEFT JOIN costureras c ON c.id = dt.costurera_id
          WHERE dt.linea_id = ?`,
        [lineaId]
      );
      return (d as any[])[0] ?? null;
    }
    case 'SELLOS': {
      const [d] = await pool.query(
        `SELECT ds.codigo_sello, t.nombre AS tinta
           FROM detalle_sello ds LEFT JOIN tintas t ON t.id = ds.tinta_id
          WHERE ds.linea_id = ?`,
        [lineaId]
      );
      return (d as any[])[0] ?? null;
    }
    default:
      return null;
  }
}

export async function porNumero(numero: number) {
  const [filas] = await pool.query(`SELECT id FROM ordenes WHERE numero_orden = ?`, [numero]);
  const fila = (filas as any[])[0];
  if (!fila) throw new ErrorHttp(404, `No existe la orden #${numero}`);
  return obtener(fila.id);
}

// ---------------------------------------------------------------- Dashboards

export interface FiltrosDashboard {
  vendedorId?: number;
  tipoTrabajoId?: number;
  soloPorVencer?: boolean;
  soloSinTomar?: boolean;
  incluirFinalizadas?: boolean;
  busqueda?: string;
}

export async function dashboard(filtros: FiltrosDashboard) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (!filtros.incluirFinalizadas) condiciones.push('v.finalizada = 0');
  if (filtros.vendedorId) {
    condiciones.push('v.vendedor_id = ?');
    valores.push(filtros.vendedorId);
  }
  if (filtros.tipoTrabajoId) {
    condiciones.push('v.tipo_trabajo_id = ?');
    valores.push(filtros.tipoTrabajoId);
  }
  if (filtros.soloPorVencer) condiciones.push('v.por_vencer = 1');
  if (filtros.soloSinTomar) condiciones.push('v.disenador_id IS NULL');
  if (filtros.busqueda) {
    condiciones.push(
      '(v.numero_orden = ? OR v.cliente LIKE ? OR v.cliente_cedula LIKE ? OR v.nombre_comercial LIKE ? OR v.telefono LIKE ?)'
    );
    const patron = `%${filtros.busqueda}%`;
    valores.push(Number(filtros.busqueda) || 0, patron, patron, patron, patron);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT * FROM v_ordenes_dashboard v
     ${where}
     ORDER BY v.por_vencer DESC, v.fecha_entrega, v.numero_orden DESC
     LIMIT 300`,
    valores
  );
  return filas;
}

// ---------------------------------------------------------------- Etapas

export async function avanzarEtapa(lineaId: number, usuarioId: number, nota?: string) {
  try {
    await pool.query(`CALL sp_avanzar_etapa(?, ?, ?)`, [lineaId, usuarioId, nota ?? null]);
  } catch (error: any) {
    // El procedimiento lanza SIGNAL con mensajes ya redactados para el usuario.
    if (error?.sqlState === '45000') throw new ErrorHttp(400, error.sqlMessage);
    throw error;
  }

  const [filas] = await pool.query(
    `SELECT ol.id, ol.secuencia_actual, ol.finalizada,
            e.codigo AS etapa_codigo, e.nombre AS etapa, e.icono, e.color
       FROM orden_lineas ol
       LEFT JOIN etapas e ON e.id = ol.etapa_actual_id
      WHERE ol.id = ?`,
    [lineaId]
  );
  return (filas as any[])[0];
}

/** El diseñador toma la orden: queda ligado a ella de aquí en adelante. */
export async function tomarLinea(lineaId: number, disenadorId: number) {
  const [filas] = await pool.query(
    `SELECT disenador_id, finalizada FROM orden_lineas WHERE id = ?`,
    [lineaId]
  );
  const linea = (filas as any[])[0];
  if (!linea) throw new ErrorHttp(404, 'Línea de orden no encontrada');
  if (linea.finalizada) throw new ErrorHttp(400, 'El trabajo ya está finalizado');
  if (linea.disenador_id) throw new ErrorHttp(409, 'Otro diseñador ya tomó este trabajo');

  await pool.query(
    `UPDATE orden_lineas SET disenador_id = ?, tomada_en = NOW()
      WHERE id = ? AND disenador_id IS NULL`,
    [disenadorId, lineaId]
  );
  return { mensaje: 'Trabajo asignado' };
}