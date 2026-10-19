import type { PoolConnection } from 'mysql2/promise';
import { pool, enTransaccion } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';

/** Categorías que trabaja el personal de imprenta. */
const TIPOS_PRODUCCION = ['TALONARIOS', 'IMPRESION_DIGITAL', 'HP_LATEX', 'SOBRES'];
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
  carbon?: boolean;
  numeracionInicial?: number | null;
  copias?: Array<{ posicion: number; rol: 'ORIGINAL' | 'INTERMEDIO' | 'FINAL'; papelId: number }>;
}

export interface LineaOrden {
  tipoTrabajoId: number;
  nombreTrabajo: string;
  cantidad: number;
  precio?: number | null;
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
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | null;
  emailMuestra?: string | null;
  urgente?: boolean;
  motivoUrgencia?: string | null;
  fechaEntrega?: string | null;
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
            tipo_copia_id, tinta, encolado, perforado, grapado, carbon, numeracion_inicial)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          t.carbon ? 1 : 0,
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
                            medio_muestra, email_muestra, urgente, motivo_urgencia,
                            observaciones, creado_por)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.clienteId,
        datos.vendedorId,
        datos.fechaIngreso ?? null,
        datos.medioMuestra ?? null,
        datos.emailMuestra?.trim() || null,
        datos.urgente ? 1 : 0,
        datos.motivoUrgencia?.trim() || null,
        datos.observaciones ?? null,
        creadoPor,
      ]
    );
    const ordenId = (resultado as any).insertId;

    for (const linea of datos.lineas) {
      const [res] = await cx.query(
        `INSERT INTO orden_lineas
           (orden_id, linea, tipo_trabajo_id, nombre_trabajo, cantidad, precio,
            archivo_sin_cambios, observaciones)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?)`,
        [
          ordenId,
          linea.tipoTrabajoId,
          linea.nombreTrabajo,
          linea.cantidad,
          linea.precio ?? null,
          linea.archivoSinCambios ? 1 : 0,
          linea.observaciones ?? null,
        ]
      );
      const lineaId = (res as any).insertId;

      await insertarDetalle(cx, lineaId, linea);

      // Coloca la línea en su primera etapa (Diseño) y deja el registro.
      await cx.query(`CALL sp_avanzar_etapa(?, ?, NULL)`, [lineaId, creadoPor]);
    }
    // Una orden urgente lleva la fecha que se acordó, no la calculada por plazo.
    if (datos.urgente && datos.fechaEntrega) {
      await cx.query(`UPDATE orden_lineas SET fecha_entrega = ? WHERE orden_id = ?`, [
        datos.fechaEntrega,
        ordenId,
      ]);
      await cx.query(`UPDATE ordenes SET fecha_entrega = ? WHERE id = ?`, [
        datos.fechaEntrega,
        ordenId,
      ]);
    }

    const [orden] = await cx.query(
      `SELECT id, numero_orden, fecha_ingreso, fecha_entrega FROM ordenes WHERE id = ?`,
      [ordenId]
    );
    // Los ids de las líneas vuelven en el mismo orden en que llegaron, para
    // que la pantalla pueda subirle la muestra a cada trabajo recién creado.
    const [lineas] = await cx.query(
      `SELECT id, linea FROM orden_lineas WHERE orden_id = ? ORDER BY linea`,
      [ordenId]
    );
    return { ...(orden as any[])[0], lineas };
  });
}

// ---------------------------------------------------------------- Plantilla

/**
 * Devuelve la orden con los nombres de campo que usa el formulario, para
 * volver a pedirla o para editarla. Con siguienteNumeracion, los talonarios
 * arrancan donde quedó el anterior: numeracion_final + 1.
 */
export async function plantilla(id: number, siguienteNumeracion = false) {
  const [ordenes] = await pool.query(
    `SELECT o.id, o.numero_orden, o.cliente_id, o.vendedor_id, o.fecha_ingreso,
            o.fecha_entrega, o.observaciones, o.medio_muestra, o.email_muestra,
            o.urgente, o.motivo_urgencia,
            c.cedula AS cliente_cedula, c.nombre AS cliente_nombre,
            c.nombre_comercial, c.telefono, c.email_facturacion,
            v.nombre_completo AS vendedor
       FROM ordenes o
       JOIN clientes c ON c.id = o.cliente_id
       JOIN usuarios v ON v.id = o.vendedor_id
      WHERE o.id = ?`,
    [id]
  );
  const orden = (ordenes as any[])[0];
  if (!orden) throw new ErrorHttp(404, 'Orden no encontrada');

  const [filas] = await pool.query(
    `SELECT ol.id, ol.tipo_trabajo_id, tt.codigo AS tipo_codigo, tt.nombre AS tipo_trabajo,
            ol.nombre_trabajo, ol.cantidad, ol.precio, ol.archivo_sin_cambios,
            ol.observaciones, ol.secuencia_actual, ol.tomada_en, ol.finalizada,
            ol.entregada, e.nombre AS etapa
       FROM orden_lineas ol
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
       LEFT JOIN etapas e ON e.id = ol.etapa_actual_id
      WHERE ol.orden_id = ?
      ORDER BY ol.linea`,
    [id]
  );

  const lineas = [];
  for (const l of filas as any[]) {
    const base = {
      lineaId: l.id,
      tipoTrabajoId: l.tipo_trabajo_id,
      tipoCodigo: l.tipo_codigo,
      tipoTrabajo: l.tipo_trabajo,
      nombreTrabajo: l.nombre_trabajo,
      cantidad: l.cantidad,
      precio: l.precio === null ? '' : Number(l.precio),
      archivoSinCambios: l.archivo_sin_cambios === 1,
      observaciones: l.observaciones ?? '',
      etapa: l.etapa,
      // Un trabajo ya tomado o que paso de etapa no deberia cambiarse a la
      // ligera: la pantalla avisa antes de guardar.
      avanzada:
        l.secuencia_actual > 1 || l.tomada_en !== null || l.finalizada === 1 || l.entregada === 1,
      // Valores por defecto del formulario, los pisa el detalle de abajo.
      cantidadBlocks: '' as number | '',
      hojasPorBlock: '' as number | '',
      tamanoId: '' as number | '',
      tamanoOtro: '',
      tipoCopiaId: '' as number | '',
      tinta: '',
      encolado: false,
      perforado: false,
      grapado: false,
      carbon: false,
      numeracionInicial: '' as number | '',
      papeles: [] as number[],
      tipoSobreId: '' as number | '',
      tamano: '',
      materialId: '' as number | '',
      telaId: '' as number | '',
      perfilImpresion: '',
      codigoSello: '',
      tintaId: '' as number | '',
    };

    switch (l.tipo_codigo) {
      case 'TALONARIOS': {
        const [d] = await pool.query(
          `SELECT cantidad_blocks, hojas_por_block, tamano_id, tamano_otro, tipo_copia_id,
                  tinta, encolado, perforado, grapado, carbon,
                  numeracion_inicial, numeracion_final
             FROM detalle_talonario WHERE linea_id = ?`,
          [l.id]
        );
        const t = (d as any[])[0];
        if (t) {
          const [copias] = await pool.query(
            `SELECT posicion, papel_id FROM talonario_copias
              WHERE linea_id = ? ORDER BY posicion`,
            [l.id]
          );
          const papeles: number[] = [];
          for (const c of copias as any[]) papeles[c.posicion - 1] = c.papel_id;

          Object.assign(base, {
            cantidadBlocks: t.cantidad_blocks,
            hojasPorBlock: t.hojas_por_block,
            tamanoId: t.tamano_id ?? '',
            tamanoOtro: t.tamano_otro ?? '',
            tipoCopiaId: t.tipo_copia_id,
            tinta: t.tinta,
            encolado: t.encolado === 1,
            perforado: t.perforado === 1,
            grapado: t.grapado === 1,
            carbon: t.carbon === 1,
            numeracionInicial: siguienteNumeracion
              ? t.numeracion_final !== null
                ? Number(t.numeracion_final) + 1
                : ''
              : (t.numeracion_inicial ?? ''),
            papeles,
          });
        }
        break;
      }
      case 'SOBRES': {
        const [d] = await pool.query(
          `SELECT tipo_sobre_id, tinta FROM detalle_sobre WHERE linea_id = ?`,
          [l.id]
        );
        const s = (d as any[])[0];
        if (s) Object.assign(base, { tipoSobreId: s.tipo_sobre_id, tinta: s.tinta });
        break;
      }
      case 'HP_LATEX':
      case 'IMPRESION_DIGITAL': {
        const [d] = await pool.query(
          `SELECT tamano, material_id FROM detalle_latex WHERE linea_id = ?`,
          [l.id]
        );
        const x = (d as any[])[0];
        if (x) Object.assign(base, { tamano: x.tamano, materialId: x.material_id });
        break;
      }
      case 'TEXTIL': {
        const [d] = await pool.query(
          `SELECT tela_id, perfil_impresion FROM detalle_textil WHERE linea_id = ?`,
          [l.id]
        );
        const x = (d as any[])[0];
        if (x) {
          Object.assign(base, {
            telaId: x.tela_id,
            perfilImpresion: x.perfil_impresion ?? '',
          });
        }
        break;
      }
      case 'SELLOS': {
        const [d] = await pool.query(
          `SELECT codigo_sello, tinta_id FROM detalle_sello WHERE linea_id = ?`,
          [l.id]
        );
        const x = (d as any[])[0];
        if (x) {
          Object.assign(base, {
            codigoSello: x.codigo_sello ?? '',
            tintaId: x.tinta_id ?? '',
          });
        }
        break;
      }
    }

    lineas.push(base);
  }

  return {
    ordenId: orden.id,
    numeroOrden: orden.numero_orden,
    cliente: {
      id: orden.cliente_id,
      cedula: orden.cliente_cedula,
      nombre: orden.cliente_nombre,
      nombre_comercial: orden.nombre_comercial,
      telefono: orden.telefono,
      email_facturacion: orden.email_facturacion,
    },
    vendedorId: orden.vendedor_id,
    vendedor: orden.vendedor,
    fechaIngreso: orden.fecha_ingreso,
    fechaEntrega: orden.fecha_entrega,
    medioMuestra: orden.medio_muestra ?? '',
    emailMuestra: orden.email_muestra ?? '',
    urgente: orden.urgente === 1,
    motivoUrgencia: orden.motivo_urgencia ?? '',
    observaciones: orden.observaciones ?? '',
    lineas,
  };
}

// ---------------------------------------------------------------- Consultar

export async function obtener(id: number) {
  const [ordenes] = await pool.query(
    `SELECT o.id, o.numero_orden, o.fecha_ingreso, o.fecha_entrega, o.estado,
            o.observaciones, o.creado_en, o.finalizada_en,
            o.medio_muestra, o.email_muestra, o.urgente, o.motivo_urgencia,
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
            tt.nombre AS tipo_trabajo, ol.nombre_trabajo, ol.cantidad, ol.precio,
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
    `SELECT le.etapa_id, e.codigo, e.nombre, le.marcada_en, le.minutos_en_etapa, le.nota,
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
        `SELECT dt.perfil_impresion, dt.costurera_id, dt.sin_confeccion,
                t.nombre AS tela, c.nombre AS costurera
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

export interface CambiosOrden {
  vendedorId?: number;
  observaciones?: string | null;
  urgente?: boolean;
  motivoUrgencia?: string | null;
  fechaEntrega?: string | null;
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | null;
  emailMuestra?: string | null;
}

export async function actualizar(id: number, cambios: CambiosOrden, usuarioId: number) {
  const [filas] = await pool.query(
    `SELECT id, estado, urgente, fecha_entrega, observaciones FROM ordenes WHERE id = ?`,
    [id]
  );
  const antes = (filas as any[])[0];
  if (!antes) throw new ErrorHttp(404, 'Orden no encontrada');
  if (antes.estado === 'ANULADA') throw new ErrorHttp(400, 'La orden está anulada');

  await pool.query(
    `UPDATE ordenes
        SET vendedor_id     = COALESCE(?, vendedor_id),
            observaciones   = COALESCE(?, observaciones),
            urgente         = COALESCE(?, urgente),
            motivo_urgencia = COALESCE(?, motivo_urgencia),
            fecha_entrega   = COALESCE(?, fecha_entrega),
            medio_muestra   = COALESCE(?, medio_muestra),
            email_muestra   = COALESCE(?, email_muestra)
      WHERE id = ?`,
    [
      cambios.vendedorId ?? null,
      cambios.observaciones ?? null,
      cambios.urgente === undefined ? null : cambios.urgente ? 1 : 0,
      cambios.motivoUrgencia ?? null,
      cambios.fechaEntrega ?? null,
      cambios.medioMuestra ?? null,
      cambios.emailMuestra ?? null,
      id,
    ]
  );

  // La fecha de la orden manda sobre la de sus líneas.
  if (cambios.fechaEntrega) {
    await pool.query(`UPDATE orden_lineas SET fecha_entrega = ? WHERE orden_id = ?`, [
      cambios.fechaEntrega,
      id,
    ]);
  }

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
     VALUES ('ordenes', ?, 'UPDATE', ?,
             JSON_OBJECT('urgente', ?, 'fecha_entrega', ?),
             JSON_OBJECT('urgente', ?, 'fecha_entrega', ?))`,
    [
      id,
      usuarioId,
      antes.urgente,
      antes.fecha_entrega,
      cambios.urgente === undefined ? antes.urgente : cambios.urgente ? 1 : 0,
      cambios.fechaEntrega ?? antes.fecha_entrega,
    ]
  );

  return obtener(id);
}

export interface OrdenCompleta {
  fechaIngreso?: string | null;
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | null;
  emailMuestra?: string | null;
  urgente?: boolean;
  motivoUrgencia?: string | null;
  fechaEntrega?: string | null;
  observaciones?: string | null;
  lineas: Array<LineaOrden & { lineaId: number }>;
}

/**
 * Edita la orden entera: los datos y los campos de cada trabajo. No cambia
 * el cliente ni el vendedor —quedan como se registró la orden— ni agrega o
 * quita trabajos: los que llegan tienen que ser exactamente los que ya tiene.
 *
 * El detalle de cada trabajo se rehace, no se parchea, para no quedar con
 * copias de talonario a medias. Lo que puso produccion (la costurera y el
 * perfil de impresion) se conserva.
 */
export async function actualizarCompleta(
  id: number,
  datos: OrdenCompleta,
  usuarioId: number
) {
  const [filas] = await pool.query(
    `SELECT id, estado, urgente, fecha_entrega FROM ordenes WHERE id = ?`,
    [id]
  );
  const antes = (filas as any[])[0];
  if (!antes) throw new ErrorHttp(404, 'Orden no encontrada');
  if (antes.estado === 'ANULADA') throw new ErrorHttp(400, 'La orden está anulada');

  const [lineasActuales] = await pool.query(
    `SELECT ol.id, ol.tipo_trabajo_id, ol.archivo_sin_cambios, ol.secuencia_actual,
            ol.tomada_en, ol.finalizada, ol.entregada, tt.codigo AS tipo_codigo
       FROM orden_lineas ol
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
      WHERE ol.orden_id = ?`,
    [id]
  );
  const actuales = new Map(
    (lineasActuales as any[]).map((l) => [l.id as number, l])
  );

  if (datos.lineas.length !== actuales.size) {
    throw new ErrorHttp(
      400,
      'Al editar no se pueden agregar ni quitar trabajos de la orden'
    );
  }
  for (const linea of datos.lineas) {
    const actual = actuales.get(linea.lineaId);
    if (!actual) throw new ErrorHttp(400, 'Uno de los trabajos no pertenece a esta orden');
    if (actual.tipo_trabajo_id !== linea.tipoTrabajoId) {
      throw new ErrorHttp(
        400,
        'No se puede cambiar el tipo de trabajo de un trabajo ya registrado'
      );
    }
  }

  await enTransaccion(async (cx) => {
    await cx.query(
      `UPDATE ordenes
          SET fecha_ingreso   = COALESCE(?, fecha_ingreso),
              observaciones   = ?,
              urgente         = ?,
              motivo_urgencia = ?,
              fecha_entrega   = COALESCE(?, fecha_entrega),
              medio_muestra   = ?,
              email_muestra   = ?
        WHERE id = ?`,
      [
        datos.fechaIngreso ?? null,
        datos.observaciones ?? null,
        datos.urgente ? 1 : 0,
        datos.urgente ? (datos.motivoUrgencia ?? null) : null,
        datos.urgente ? (datos.fechaEntrega ?? null) : null,
        datos.medioMuestra ?? null,
        datos.emailMuestra?.trim() || null,
        id,
      ]
    );

    if (datos.urgente && datos.fechaEntrega) {
      await cx.query(`UPDATE orden_lineas SET fecha_entrega = ? WHERE orden_id = ?`, [
        datos.fechaEntrega,
        id,
      ]);
    }

    for (const linea of datos.lineas) {
      const actual = actuales.get(linea.lineaId)!;

      // Cambiar "archivo sin cambios" mueve las etapas del flujo. En un
      // trabajo que ya avanzo dejaria la secuencia apuntando a una etapa
      // que ya no existe, asi que ahi se respeta lo que estaba.
      const yaAvanzo =
        actual.secuencia_actual > 1 ||
        actual.tomada_en !== null ||
        actual.finalizada === 1 ||
        actual.entregada === 1;
      const sinCambios = yaAvanzo
        ? actual.archivo_sin_cambios === 1
        : linea.archivoSinCambios === true;

      await cx.query(
        `UPDATE orden_lineas
            SET nombre_trabajo      = ?,
                cantidad            = ?,
                precio              = ?,
                archivo_sin_cambios = ?,
                observaciones       = ?
          WHERE id = ? AND orden_id = ?`,
        [
          linea.nombreTrabajo,
          linea.cantidad,
          linea.precio ?? null,
          sinCambios ? 1 : 0,
          linea.observaciones ?? null,
          linea.lineaId,
          id,
        ]
      );

      // La costurera, el perfil y "sin confeccion" los pone produccion, no
      // este formulario: se leen antes de borrar y se reponen despues.
      let textilPrevio: any = null;
      if (actual.tipo_codigo === 'TEXTIL') {
        const [previo] = await cx.query(
          `SELECT costurera_id, sin_confeccion, perfil_impresion
             FROM detalle_textil WHERE linea_id = ?`,
          [linea.lineaId]
        );
        textilPrevio = (previo as any[])[0] ?? null;
        if (textilPrevio && linea.textil) {
          linea.textil.costureraId = textilPrevio.costurera_id;
          if (!linea.textil.perfilImpresion?.trim()) {
            linea.textil.perfilImpresion = textilPrevio.perfil_impresion;
          }
        }
      }

      await borrarDetalle(cx, linea.lineaId, actual.tipo_codigo);
      await insertarDetalle(cx, linea.lineaId, linea);

      if (textilPrevio) {
        await cx.query(`UPDATE detalle_textil SET sin_confeccion = ? WHERE linea_id = ?`, [
          textilPrevio.sin_confeccion,
          linea.lineaId,
        ]);
      }
    }

    await cx.query(
      `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
       VALUES ('ordenes', ?, 'UPDATE', ?,
               JSON_OBJECT('edicion', 'completa', 'urgente', ?, 'fecha_entrega', ?),
               JSON_OBJECT('edicion', 'completa', 'urgente', ?, 'fecha_entrega', ?))`,
      [
        id,
        usuarioId,
        antes.urgente,
        antes.fecha_entrega,
        datos.urgente ? 1 : 0,
        datos.fechaEntrega ?? antes.fecha_entrega,
      ]
    );
  });

  return obtener(id);
}

/** Borra el detalle específico para poder volver a insertarlo. */
async function borrarDetalle(cx: PoolConnection, lineaId: number, codigo: string) {
  const tabla: Record<string, string> = {
    TALONARIOS: 'detalle_talonario',
    SOBRES: 'detalle_sobre',
    HP_LATEX: 'detalle_latex',
    IMPRESION_DIGITAL: 'detalle_latex',
    TEXTIL: 'detalle_textil',
    SELLOS: 'detalle_sello',
  };
  const nombre = tabla[codigo];
  if (!nombre) return;
  // talonario_copias cuelga de detalle_talonario con ON DELETE CASCADE.
  await cx.query(`DELETE FROM ${nombre} WHERE linea_id = ?`, [lineaId]);
}

// ---------------------------------------------------------------- Dashboards

export interface FiltrosDashboard {
  vendedorId?: number;
  tipoTrabajoId?: number;
  soloPorVencer?: boolean;
  soloSinTomar?: boolean;
  misTrabajosDe?: number;
  soloProduccion?: boolean;
  incluirFinalizadas?: boolean;
  busqueda?: string;
  campoBusqueda?: 'CLIENTE' | 'ORDEN' | 'TELEFONO';}

export async function dashboard(filtros: FiltrosDashboard) {
  const condiciones: string[] = [];
  const valores: any[] = [];

    if (!filtros.incluirFinalizadas) condiciones.push('v.finalizada = 0');

  // El personal de imprenta solo ve sus categorías.
  if (filtros.soloProduccion) {
    condiciones.push(`v.tipo_codigo IN (${TIPOS_PRODUCCION.map(() => '?').join(',')})`);
    valores.push(...TIPOS_PRODUCCION);
  }
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
  if (filtros.misTrabajosDe) {
    condiciones.push('v.disenador_id = ?');
    valores.push(filtros.misTrabajosDe);
  }
  
  if (filtros.busqueda) {
    const patron = `%${filtros.busqueda}%`;
    switch (filtros.campoBusqueda) {
      case 'ORDEN':
        condiciones.push('v.numero_orden = ?');
        valores.push(Number(filtros.busqueda) || 0);
        break;
      case 'TELEFONO':
        // Compara solo los dígitos, para que dé igual cómo esté escrito.
        condiciones.push(
          "REPLACE(REPLACE(REPLACE(v.telefono,' ',''),'-',''),'+','') LIKE ?"
        );
        valores.push(`%${filtros.busqueda.replace(/\D/g, '')}%`);
        break;
      case 'CLIENTE':
        condiciones.push(
          '(v.cliente LIKE ? OR v.nombre_comercial LIKE ? OR v.cliente_cedula LIKE ?)'
        );
        valores.push(patron, patron, patron);
        break;
      default:
        // Sin campo definido, busca en todo.
        condiciones.push(
          '(v.numero_orden = ? OR v.cliente LIKE ? OR v.cliente_cedula LIKE ? OR v.nombre_comercial LIKE ? OR v.telefono LIKE ?)'
        );
        valores.push(Number(filtros.busqueda) || 0, patron, patron, patron, patron);
    }
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

/** Trabajos textiles que están en manos de una costurera. */
export async function confeccionTextil(costureraId?: number) {
  const condiciones = [
    `v.tipo_codigo = 'TEXTIL'`,
    'v.finalizada = 0',
    'v.costurera_id IS NOT NULL',
  ];
  const valores: any[] = [];

  if (costureraId) {
    condiciones.push('v.costurera_id = ?');
    valores.push(costureraId);
  }

  const [filas] = await pool.query(
    `SELECT * FROM v_ordenes_dashboard v
      WHERE ${condiciones.join(' AND ')}
      ORDER BY v.fecha_entrega, v.numero_orden`,
    valores
  );
  return filas;
}

// ---------------------------------------------------------------- Etapas

export interface DatosAvance {
  nota?: string | null;
  costureraId?: number | null;
  sinConfeccion?: boolean;
}

export interface DatosAvance {
  nota?: string | null;
  costureraId?: number | null;
  sinConfeccion?: boolean;
  perfilImpresion?: string | null;
}

export async function avanzarEtapa(lineaId: number, usuarioId: number, datos: DatosAvance = {}) {
  // Antes de avanzar averiguamos cuál sería la siguiente etapa.
  const [previo] = await pool.query(
    `SELECT ol.id, tt.codigo AS tipo_codigo,
            (SELECT e.codigo
               FROM flujo_etapas f
               JOIN etapas e ON e.id = f.etapa_id
              WHERE f.tipo_trabajo_id = ol.tipo_trabajo_id
                AND f.secuencia > ol.secuencia_actual
                AND NOT (ol.archivo_sin_cambios = 1 AND f.omitir_sin_cambios = 1)
              ORDER BY f.secuencia LIMIT 1) AS siguiente_codigo,
            dt.costurera_id   AS costurera_actual,
            dt.sin_confeccion AS sin_confeccion_actual,
            dt.perfil_impresion AS perfil_actual
       FROM orden_lineas ol
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
       LEFT JOIN detalle_textil dt ON dt.linea_id = ol.id
      WHERE ol.id = ?`,
    [lineaId]
  );
  const info = (previo as any[])[0];
  if (!info) throw new ErrorHttp(404, 'Línea de orden no encontrada');

  const esTextil = info.tipo_codigo === 'TEXTIL';

  // Un textil no se imprime sin perfil de impresión definido.
  if (esTextil && info.siguiente_codigo === 'IMPRESION') {
    const perfil = datos.perfilImpresion?.trim() || info.perfil_actual;
    if (!perfil) {
      throw new ErrorHttp(
        400,
        'Debe indicar el perfil de impresión antes de imprimir',
        'PERFIL_REQUERIDO'
      );
    }
    if (datos.perfilImpresion?.trim()) {
      await pool.query(`UPDATE detalle_textil SET perfil_impresion = ? WHERE linea_id = ?`, [
        datos.perfilImpresion.trim(),
        lineaId,
      ]);
    }
  }

  // Al sublimar hay que definir quién confecciona (o que no lleva confección).
  if (esTextil && info.siguiente_codigo === 'SUBLIMACION') {
    const yaDefinido = info.costurera_actual != null || info.sin_confeccion_actual === 1;
    const llegaDefinido = datos.costureraId != null || datos.sinConfeccion === true;

    if (!yaDefinido && !llegaDefinido) {
      throw new ErrorHttp(
        400,
        'Debe indicar a qué costurera se entrega el trabajo',
        'COSTURERA_REQUERIDA'
      );
    }

    if (llegaDefinido) {
      if (datos.sinConfeccion) {
        await pool.query(
          `UPDATE detalle_textil SET costurera_id = NULL, sin_confeccion = 1 WHERE linea_id = ?`,
          [lineaId]
        );
      } else {
        const [existe] = await pool.query(
          `SELECT id FROM costureras WHERE id = ? AND activo = 1`,
          [datos.costureraId]
        );
        if (!(existe as any[]).length) {
          throw new ErrorHttp(400, 'La costurera indicada no existe o está inactiva');
        }
        await pool.query(
          `UPDATE detalle_textil SET costurera_id = ?, sin_confeccion = 0 WHERE linea_id = ?`,
          [datos.costureraId, lineaId]
        );
      }
    }
  }

  // La entrega siempre deja constancia escrita.
  if (info.siguiente_codigo === 'ENTREGADO' && !datos.nota?.trim()) {
    throw new ErrorHttp(400, 'Debe escribir una observación de la entrega', 'NOTA_REQUERIDA');
  }

  try {
    await pool.query(`CALL sp_avanzar_etapa(?, ?, ?)`, [
      lineaId,
      usuarioId,
      datos.nota?.trim() || null,
    ]);
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
  const resultado = (filas as any[])[0];

  // Si esta línea cerró la orden, el trigger encoló el aviso al cliente.
  if (resultado?.etapa_codigo === 'FINALIZADO') {
    const [wa] = await pool.query(
      `SELECT w.id, w.telefono, w.mensaje, o.numero_orden, c.nombre AS cliente
         FROM whatsapp_cola w
         JOIN ordenes  o ON o.id = w.orden_id
         JOIN clientes c ON c.id = o.cliente_id
         JOIN orden_lineas ol ON ol.orden_id = o.id
        WHERE ol.id = ?
          AND w.plantilla = 'ORDEN_LISTA'
          AND w.estado = 'PENDIENTE'
        ORDER BY w.id DESC
        LIMIT 1`,
      [lineaId]
    );
    const mensaje = (wa as any[])[0];
    if (mensaje) {
      resultado.whatsapp = {
        ...mensaje,
        enlace: `https://wa.me/${mensaje.telefono}?text=${encodeURIComponent(mensaje.mensaje)}`,
      };
    }
  }

  return resultado;
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

  const [res] = await pool.query(
    `UPDATE orden_lineas SET disenador_id = ?, tomada_en = NOW()
      WHERE id = ? AND disenador_id IS NULL`,
    [disenadorId, lineaId]
  );
  // Si otro la tomó en el intervalo, no la pisamos.
  if ((res as any).affectedRows === 0) {
    throw new ErrorHttp(409, 'Otro diseñador ya tomó este trabajo');
  }

  return { mensaje: 'Trabajo asignado' };
}

/**
 * Corrige el precio anotado en una linea. El precio es referencia interna
 * para saber cuanto se cotizo; no alimenta ninguna facturacion.
 */
export async function fijarPrecio(lineaId: number, precio: number | null) {
  const [res] = await pool.query(
    `UPDATE orden_lineas SET precio = ? WHERE id = ?`,
    [precio, lineaId]
  );
  if (!(res as any).affectedRows) throw new ErrorHttp(404, 'Línea no encontrada');

  const [filas] = await pool.query(
    `SELECT id, orden_id, precio FROM orden_lineas WHERE id = ?`,
    [lineaId]
  );
  return (filas as any[])[0];
}


/**
 * Cambia la costurera de un trabajo textil ya enviado a confeccion.
 * A veces el trabajo se reparte distinto despues de haberlo asignado.
 */
export async function cambiarCosturera(
  lineaId: number,
  datos: { costureraId?: number | null; sinConfeccion?: boolean }
) {
  const [filas] = await pool.query(
    `SELECT dt.linea_id, tt.codigo AS tipo
       FROM detalle_textil dt
       JOIN orden_lineas ol ON ol.id = dt.linea_id
       JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
      WHERE dt.linea_id = ?`,
    [lineaId]
  );
  if (!(filas as any[]).length) {
    throw new ErrorHttp(404, 'Ese trabajo no es textil o no existe');
  }

  if (datos.sinConfeccion) {
    await pool.query(
      `UPDATE detalle_textil SET costurera_id = NULL, sin_confeccion = 1 WHERE linea_id = ?`,
      [lineaId]
    );
  } else {
    const [existe] = await pool.query(
      `SELECT id FROM costureras WHERE id = ? AND activo = 1`,
      [datos.costureraId]
    );
    if (!(existe as any[]).length) {
      throw new ErrorHttp(400, 'La costurera indicada no existe o está inactiva');
    }
    await pool.query(
      `UPDATE detalle_textil SET costurera_id = ?, sin_confeccion = 0 WHERE linea_id = ?`,
      [datos.costureraId, lineaId]
    );
  }

  const [resultado] = await pool.query(
    `SELECT dt.costurera_id, dt.sin_confeccion, c.nombre AS costurera
       FROM detalle_textil dt
       LEFT JOIN costureras c ON c.id = dt.costurera_id
      WHERE dt.linea_id = ?`,
    [lineaId]
  );
  return (resultado as any[])[0];
}
