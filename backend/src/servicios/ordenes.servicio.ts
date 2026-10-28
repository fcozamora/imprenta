import type { PoolConnection } from 'mysql2/promise';
import { pool, enTransaccion } from '../db/pool.js';
import { ErrorHttp } from '../util/errores.js';
import * as pagos from './pagos.servicio.js';
import type { MetodoPago } from './pagos.servicio.js';

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
  /** Diseñador al que ya se le asigna el trabajo al ingresar la orden. */
  disenadorId?: number | null;
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
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | 'OTRO' | null;
  emailMuestra?: string | null;
  /** La persona con quien se trata esta orden, si no es el cliente mismo. */
  contactoNombre?: string | null;
  /** Telefono o correo escrito a mano cuando el medio es OTRO. */
  contactoDato?: string | null;
  urgente?: boolean;
  motivoUrgencia?: string | null;
  fechaEntrega?: string | null;
  observaciones?: string | null;
  /** Lo que el cliente dejo pagado al ingresar la orden. */
  pago?: {
    abono?: number | null;
    cancelada?: boolean;
    metodo: MetodoPago;
    nota?: string | null;
  };
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
                            contacto_nombre, contacto_dato,
                            medio_muestra, email_muestra, urgente, motivo_urgencia,
                            observaciones, creado_por)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.clienteId,
        datos.vendedorId,
        datos.fechaIngreso ?? null,
        datos.contactoNombre?.trim() || null,
        datos.contactoDato?.trim() || null,
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
      // El diseñador se asigna, no se "toma": tomada_en queda en blanco
      // para que el trabajo no cuente como ya avanzado.
      const [res] = await cx.query(
        `INSERT INTO orden_lineas
           (orden_id, linea, tipo_trabajo_id, nombre_trabajo, cantidad, precio,
            archivo_sin_cambios, observaciones, disenador_id)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ordenId,
          linea.tipoTrabajoId,
          linea.nombreTrabajo,
          linea.cantidad,
          linea.precio ?? null,
          linea.archivoSinCambios ? 1 : 0,
          linea.observaciones ?? null,
          linea.disenadorId ?? null,
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

    // Lo que dejo pagado al ingresar la orden. "Cancelada" es anotar un
    // abono por el total, no una casilla guardada aparte.
    if (datos.pago) {
      const [suma] = await cx.query(
        `SELECT COALESCE(SUM(precio), 0) AS total FROM orden_lineas WHERE orden_id = ?`,
        [ordenId]
      );
      const total = Number((suma as any[])[0].total);
      const monto = datos.pago.cancelada ? total : Number(datos.pago.abono ?? 0);
      if (monto > 0) {
        await cx.query(
          `INSERT INTO orden_abonos (orden_id, monto, metodo_pago, nota, registrado_por)
           VALUES (?, ?, ?, ?, ?)`,
          [ordenId, monto, datos.pago.metodo, datos.pago.nota?.trim() || null, creadoPor]
        );
      }
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

// ---------------------------------------------------------------- Sugerencias

/**
 * Nombres de trabajo que ya se han usado, para sugerirlos al escribir.
 * Primero los de este cliente —"Factura de contado" suele ser el mismo
 * trabajo cada vez— y después los más pedidos de toda la imprenta.
 *
 * Sale de productos_cliente, que ya se va llenando solo con cada orden.
 */
export async function nombresDeTrabajo(clienteId?: number, limite = 150) {
  const nombres: string[] = [];
  const vistos = new Set<string>();

  const agregar = (filas: any[]) => {
    for (const f of filas) {
      const n = String(f.nombre_trabajo).trim();
      const clave = n.toLowerCase();
      if (!n || vistos.has(clave)) continue;
      vistos.add(clave);
      nombres.push(n);
      if (nombres.length >= limite) break;
    }
  };

  if (clienteId) {
    const [suyos] = await pool.query(
      `SELECT nombre_trabajo FROM productos_cliente
        WHERE cliente_id = ?
        ORDER BY ultima_fecha DESC, veces_solicitado DESC
        LIMIT ?`,
      [clienteId, limite]
    );
    agregar(suyos as any[]);
  }

  if (nombres.length < limite) {
    const [todos] = await pool.query(
      `SELECT nombre_trabajo, SUM(veces_solicitado) AS veces
         FROM productos_cliente
        GROUP BY nombre_trabajo
        ORDER BY veces DESC, MAX(ultima_fecha) DESC
        LIMIT ?`,
      [limite]
    );
    agregar(todos as any[]);
  }

  return nombres;
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
            o.contacto_nombre, o.contacto_dato, o.urgente, o.motivo_urgencia,
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
            ol.entregada, ol.disenador_id, e.nombre AS etapa,
            (SELECT MAX(la.id) FROM linea_archivos la WHERE la.linea_id = ol.id)
              AS muestra_archivo_id
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
      disenadorId: l.disenador_id ?? '',
      etapa: l.etapa,
      // Para "pedir de nuevo": la muestra que ya traía ese trabajo, para
      // engancharla a la orden nueva sin volver a subirla.
      muestraArchivoId: l.muestra_archivo_id ?? null,
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
    contactoNombre: orden.contacto_nombre ?? '',
    contactoDato: orden.contacto_dato ?? '',
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
            o.medio_muestra, o.email_muestra, o.contacto_nombre, o.contacto_dato,
            o.urgente, o.motivo_urgencia,
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

  const [pago, abonos] = await Promise.all([pagos.resumen(id), pagos.listar(id)]);

  return { ...orden, lineas, pago, abonos };
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
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | 'OTRO' | null;
  emailMuestra?: string | null;
  /** La persona con quien se trata esta orden, si no es el cliente mismo. */
  contactoNombre?: string | null;
  /** Telefono o correo escrito a mano cuando el medio es OTRO. */
  contactoDato?: string | null;
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
            email_muestra   = COALESCE(?, email_muestra),
            contacto_nombre = COALESCE(?, contacto_nombre),
            contacto_dato   = COALESCE(?, contacto_dato)
      WHERE id = ?`,
    [
      cambios.vendedorId ?? null,
      cambios.observaciones ?? null,
      cambios.urgente === undefined ? null : cambios.urgente ? 1 : 0,
      cambios.motivoUrgencia ?? null,
      cambios.fechaEntrega ?? null,
      cambios.medioMuestra ?? null,
      cambios.emailMuestra ?? null,
      cambios.contactoNombre ?? null,
      cambios.contactoDato ?? null,
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
  medioMuestra?: 'WHATSAPP' | 'EMAIL' | 'VENDEDOR' | 'OTRO' | null;
  emailMuestra?: string | null;
  /** La persona con quien se trata esta orden, si no es el cliente mismo. */
  contactoNombre?: string | null;
  /** Telefono o correo escrito a mano cuando el medio es OTRO. */
  contactoDato?: string | null;
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
  usuarioId: number,
  puedeVerPrecio = true
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

  // Cómo estaba antes, para poder contar después qué fue lo que cambió.
  const comoEstaba = await plantilla(id);
  const nombres = await nombresDeCatalogos();

  // A quien no ve precios tampoco se le toma el precio que mande: su
  // formulario los trae vacíos, y guardar la orden los borraría.
  if (!puedeVerPrecio) {
    for (const linea of datos.lineas) {
      const previa = comoEstaba.lineas.find((x: any) => x.lineaId === linea.lineaId);
      linea.precio = previa && previa.precio !== '' ? Number(previa.precio) : null;
    }
  }

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
              email_muestra   = ?,
              contacto_nombre = ?,
              contacto_dato   = ?
        WHERE id = ?`,
      [
        datos.fechaIngreso ?? null,
        datos.observaciones ?? null,
        datos.urgente ? 1 : 0,
        datos.urgente ? (datos.motivoUrgencia ?? null) : null,
        datos.urgente ? (datos.fechaEntrega ?? null) : null,
        datos.medioMuestra ?? null,
        datos.emailMuestra?.trim() || null,
        datos.contactoNombre?.trim() || null,
        // El dato escrito a mano solo tiene sentido con el medio OTRO.
        datos.medioMuestra === 'OTRO' ? datos.contactoDato?.trim() || null : null,
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
                observaciones       = ?,
                disenador_id        = ?
          WHERE id = ? AND orden_id = ?`,
        [
          linea.nombreTrabajo,
          linea.cantidad,
          linea.precio ?? null,
          sinCambios ? 1 : 0,
          linea.observaciones ?? null,
          linea.disenadorId ?? null,
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

    // Queda escrito qué cambió y quién lo hizo. Si no cambió nada, no se
    // registra: un "guardar" sin tocar nada no es un cambio.
    const cambios = describirCambios(comoEstaba, datos, nombres);
    if (cambios.length) {
      await cx.query(
        `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
         VALUES ('ordenes', ?, 'UPDATE', ?, JSON_OBJECT('edicion', 'completa'), ?)`,
        [id, usuarioId, JSON.stringify({ edicion: 'completa', cambios })]
      );
    }
  });

  return obtener(id);
}

// ------------------------------------------------- Registro de cambios

/** Deja todo como texto comparable: null, '' y undefined son lo mismo. */
function textoDe(valor: any): string {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'number') return String(valor);
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).trim();
}

/** Catálogos chicos, para que el registro diga nombres y no números. */
async function nombresDeCatalogos() {
  const tabla = async (sql: string) => {
    const [filas] = await pool.query(sql);
    return new Map((filas as any[]).map((f) => [Number(f.id), String(f.nombre)]));
  };
  const [papeles, tamanos, copias, materiales, telas, sobres, tintas, personas] =
    await Promise.all([
    tabla(`SELECT id, nombre FROM tipos_papel`),
    tabla(`SELECT id, nombre FROM tamanos_talonario`),
    tabla(`SELECT id, nombre FROM tipos_copia`),
    tabla(`SELECT id, nombre FROM materiales_latex`),
    tabla(`SELECT id, nombre FROM telas`),
    tabla(`SELECT id, nombre FROM tipos_sobre`),
    tabla(`SELECT id, nombre FROM tintas`),
    tabla(`SELECT id, nombre_completo AS nombre FROM usuarios`),
  ]);
  return { papeles, tamanos, copias, materiales, telas, sobres, tintas, personas };
}

type Nombres = Awaited<ReturnType<typeof nombresDeCatalogos>>;

/** Pone la línea que llega del formulario con la misma forma que la plantilla. */
function aplanarLinea(l: LineaOrden & { lineaId: number }) {
  const t = l.talonario;
  return {
    nombreTrabajo: l.nombreTrabajo,
    cantidad: l.cantidad,
    disenadorId: l.disenadorId ?? '',
    precio: l.precio ?? '',
    archivoSinCambios: l.archivoSinCambios === true,
    observaciones: l.observaciones ?? '',
    cantidadBlocks: t?.cantidadBlocks ?? '',
    hojasPorBlock: t?.hojasPorBlock ?? '',
    tamanoId: t?.tamanoId ?? '',
    tamanoOtro: t?.tamanoOtro ?? '',
    tipoCopiaId: t?.tipoCopiaId ?? '',
    tinta: t?.tinta ?? l.sobre?.tinta ?? '',
    encolado: t?.encolado === true,
    perforado: t?.perforado === true,
    grapado: t?.grapado === true,
    carbon: t?.carbon === true,
    numeracionInicial: t?.numeracionInicial ?? '',
    papeles: (t?.copias ?? []).map((c) => c.papelId),
    tipoSobreId: l.sobre?.tipoSobreId ?? '',
    tamano: l.latex?.tamano ?? '',
    materialId: l.latex?.materialId ?? '',
    telaId: l.textil?.telaId ?? '',
    perfilImpresion: l.textil?.perfilImpresion ?? '',
    codigoSello: l.sello?.codigoSello ?? '',
    tintaId: l.sello?.tintaId ?? '',
  };
}

/**
 * Compara la orden como estaba contra la que llega y describe en palabras
 * lo que cambió, para que el registro se pueda leer sin saber de tablas.
 */
function describirCambios(antes: any, datos: OrdenCompleta, n: Nombres): string[] {
  const cambios: string[] = [];

  const comparar = (
    etiqueta: string,
    a: any,
    d: any,
    formato: (v: any) => string = textoDe
  ) => {
    const va = textoDe(a) === '' ? '' : formato(a);
    const vd = textoDe(d) === '' ? '' : formato(d);
    if (va === vd) return;
    cambios.push(`${etiqueta}: ${va || '—'} → ${vd || '—'}`);
  };

  // dd/mm/aaaa, que es como se leen aquí.
  const comoFecha = (v: any) => {
    const t = textoDe(v).slice(0, 10);
    const p = t.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : t;
  };
  const MEDIOS: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Correo electrónico',
    VENDEDOR: 'Muestra a vendedor(a)',
    OTRO: 'Otro contacto',
  };

  // La fecha de ingreso solo se pisa si viene: si no, la consulta la deja
  // como estaba y no hay nada que anotar.
  if (datos.fechaIngreso) {
    comparar('Fecha de ingreso', antes.fechaIngreso, datos.fechaIngreso, comoFecha);
  }
  // Igual que arriba: la entrega solo se cambia en una orden urgente con
  // fecha acordada; si no, la consulta la deja como estaba.
  if (datos.urgente && datos.fechaEntrega) {
    comparar('Fecha de entrega', antes.fechaEntrega, datos.fechaEntrega, comoFecha);
  }
  comparar('Urgente', antes.urgente, datos.urgente === true);
  comparar('Motivo de urgencia', antes.motivoUrgencia, datos.motivoUrgencia);
  comparar(
    'Enviar muestra por',
    antes.medioMuestra,
    datos.medioMuestra,
    (v) => MEDIOS[textoDe(v)] ?? textoDe(v)
  );
  comparar('Correo de la muestra', antes.emailMuestra, datos.emailMuestra);
  comparar('Persona de contacto', antes.contactoNombre, datos.contactoNombre);
  comparar('Contacto de la muestra', antes.contactoDato, datos.contactoDato);
  comparar('Observaciones de la orden', antes.observaciones, datos.observaciones);

  const porId = (mapa: Map<number, string>) => (v: any) =>
    mapa.get(Number(v)) ?? textoDe(v);

  for (const linea of datos.lineas) {
    const previa = antes.lineas.find((x: any) => x.lineaId === linea.lineaId);
    if (!previa) continue;
    const ahora = aplanarLinea(linea);
    const rotulo = previa.nombreTrabajo || `Trabajo ${linea.lineaId}`;
    const del = (campo: string) => `${rotulo} · ${campo}`;

    comparar(del('Nombre'), previa.nombreTrabajo, ahora.nombreTrabajo);
    comparar(del('Cantidad'), previa.cantidad, ahora.cantidad);
    comparar(del('Diseñador'), previa.disenadorId, ahora.disenadorId, porId(n.personas));
    comparar(del('Precio'), previa.precio, ahora.precio);
    comparar(del('Archivo sin cambios'), previa.archivoSinCambios, ahora.archivoSinCambios);
    comparar(del('Observaciones'), previa.observaciones, ahora.observaciones);
    comparar(del('Blocks'), previa.cantidadBlocks, ahora.cantidadBlocks);
    comparar(del('Hojas por block'), previa.hojasPorBlock, ahora.hojasPorBlock);
    comparar(del('Tamaño'), previa.tamanoId, ahora.tamanoId, porId(n.tamanos));
    comparar(del('Tamaño'), previa.tamanoOtro, ahora.tamanoOtro);
    comparar(del('Copias'), previa.tipoCopiaId, ahora.tipoCopiaId, porId(n.copias));
    comparar(del('Tinta'), previa.tinta, ahora.tinta);
    comparar(del('Encolado'), previa.encolado, ahora.encolado);
    comparar(del('Perforado'), previa.perforado, ahora.perforado);
    comparar(del('Grapado'), previa.grapado, ahora.grapado);
    comparar(del('Carbón'), previa.carbon, ahora.carbon);
    comparar(del('Numeración inicial'), previa.numeracionInicial, ahora.numeracionInicial);
    comparar(del('Tipo de sobre'), previa.tipoSobreId, ahora.tipoSobreId, porId(n.sobres));
    comparar(del('Medida'), previa.tamano, ahora.tamano);
    comparar(del('Material'), previa.materialId, ahora.materialId, porId(n.materiales));
    comparar(del('Tela'), previa.telaId, ahora.telaId, porId(n.telas));
    comparar(del('Perfil de impresión'), previa.perfilImpresion, ahora.perfilImpresion);
    comparar(del('Código de sello'), previa.codigoSello, ahora.codigoSello);
    comparar(del('Tinta del sello'), previa.tintaId, ahora.tintaId, porId(n.tintas));

    const papelesAntes = (previa.papeles ?? []).map((p: number) => n.papeles.get(p) ?? p).join(' / ');
    const papelesAhora = ahora.papeles.map((p) => n.papeles.get(p) ?? p).join(' / ');
    if (papelesAntes !== papelesAhora) {
      cambios.push(`${del('Color de copias')}: ${papelesAntes || '—'} → ${papelesAhora || '—'}`);
    }
  }

  return cambios;
}

/** Lo que se le hizo a la orden, con quién y cuándo. */
export async function cambiosDeOrden(id: number, limite = 30) {
  const [filas] = await pool.query(
    `SELECT a.id, a.creado_en, a.datos_despues, u.nombre_completo AS usuario
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.tabla = 'ordenes' AND a.registro_id = ? AND a.accion = 'UPDATE'
      ORDER BY a.id DESC
      LIMIT ?`,
    [id, limite]
  );
  return (filas as any[])
    .map((f) => {
      const datos = typeof f.datos_despues === 'string'
        ? JSON.parse(f.datos_despues)
        : f.datos_despues;
      return {
        id: f.id,
        usuario: f.usuario ?? 'Sistema',
        creado_en: f.creado_en,
        // 'pago' o 'completa': sirve para no mostrarle los montos a quien no
        // tiene permiso de verlos.
        edicion: typeof datos?.edicion === 'string' ? datos.edicion : 'completa',
        cambios: Array.isArray(datos?.cambios) ? (datos.cambios as string[]) : [],
      };
    })
    .filter((f) => f.cambios.length > 0);
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

  // Cada dato se pide al entrar a la etapa que lo usa, no antes: marcar una
  // etapa significa que el trabajo está ahí, no que ya se termino.
  //
  // Sublimación es donde se usa el perfil.
  if (esTextil && info.siguiente_codigo === 'SUBLIMACION') {
    const perfil = datos.perfilImpresion?.trim() || info.perfil_actual;
    if (!perfil) {
      throw new ErrorHttp(
        400,
        'Debe indicar el perfil de impresión para sublimar',
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

  // Y en Confección es donde se sabe a quién se le entrega.
  if (esTextil && info.siguiente_codigo === 'CONFECCION') {
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
