import { Router } from 'express';
import { z } from 'zod';
import * as ordenes from '../servicios/ordenes.servicio.js';
import * as costureras from '../servicios/costureras.servicio.js';
import * as pagos from '../servicios/pagos.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';

export const rutasOrdenes = Router();
rutasOrdenes.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Esquemas

const esquemaTalonario = z.object({
  cantidadBlocks: z.number().int().positive(),
  hojasPorBlock: z.number().int().positive(),
  tamanoId: z.number().int().positive().optional().nullable(),
  tamanoOtro: z.string().trim().optional().nullable(),
  tipoCopiaId: z.number().int().positive(),
  tinta: z.string().trim().min(1, 'Indique el color de tinta'),
  encolado: z.boolean().optional(),
  perforado: z.boolean().optional(),
  grapado: z.boolean().optional(),
  carbon: z.boolean().optional(),
  numeracionInicial: z.number().int().nonnegative().optional().nullable(),
  copias: z
    .array(
      z.object({
        posicion: z.number().int().positive(),
        rol: z.enum(['ORIGINAL', 'INTERMEDIO', 'FINAL']),
        papelId: z.number().int().positive(),
      })
    )
    .optional(),
});

const esquemaLinea = z.object({
  tipoTrabajoId: z.number().int().positive(),
  nombreTrabajo: z.string().trim().min(2, 'El nombre del trabajo es obligatorio'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a cero'),
  disenadorId: z.number().int().positive().optional().nullable(),
  precio: z.number().nonnegative().optional().nullable(),
  archivoSinCambios: z.boolean().optional(),
  observaciones: z.string().trim().optional().nullable(),
  talonario: esquemaTalonario.optional(),
  sobre: z.object({ tipoSobreId: z.number().int(), tinta: z.string().trim() }).optional(),
  latex: z.object({ tamano: z.string().trim(), materialId: z.number().int() }).optional(),
  textil: z
    .object({
      telaId: z.number().int(),
      perfilImpresion: z.string().trim().optional().nullable(),
      costureraId: z.number().int().optional().nullable(),
    })
    .optional(),
  sello: z
    .object({
      codigoSello: z.string().trim().optional().nullable(),
      tintaId: z.number().int().optional().nullable(),
    })
    .optional(),
});

const esquemaOrden = z.object({
  clienteId: z.number().int().positive('Debe seleccionar un cliente'),
  vendedorId: z.number().int().positive('Debe seleccionar un vendedor'),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  medioMuestra: z.enum(['WHATSAPP', 'EMAIL', 'VENDEDOR']).optional().nullable(),
  emailMuestra: z
    .string()
    .email('El correo de la muestra no es válido')
    .optional()
    .nullable()
    .or(z.literal('')),
  urgente: z.boolean().optional(),
  motivoUrgencia: z.string().trim().max(200).optional().nullable(),
  fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
  pago: z
    .object({
      abono: z.number().nonnegative().optional().nullable(),
      cancelada: z.boolean().optional(),
      nota: z.string().trim().max(255).optional().nullable(),
    })
    .optional(),
  lineas: z.array(esquemaLinea).min(1, 'Agregue al menos un tipo de trabajo'),
});

const esquemaCosturera = z.object({
  nombre: z.string().trim().min(3, 'El nombre es obligatorio'),
  telefono: z.string().trim().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

// ---------------------------------------------------------------- Costureras
// Van primero para que ninguna ruta con parámetro las capture.

rutasOrdenes.get('/costureras', async (req, res, next) => {
  try {
    res.json(await costureras.listar(req.query.todas !== 'true'));
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.get('/costureras/carga', async (_req, res, next) => {
  try {
    res.json(await costureras.cargaDeTrabajo());
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.post('/costureras', requierePermiso('costureras.gestionar'), async (req, res, next) => {
  try {
    res.status(201).json(await costureras.crear(esquemaCosturera.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.patch(
  '/costureras/:id',
  requierePermiso('costureras.gestionar'),
  async (req, res, next) => {
    try {
      const datos = esquemaCosturera
        .partial()
        .extend({ activo: z.boolean().optional() })
        .parse(req.body);
      res.json(await costureras.actualizar(Number(req.params.id), datos));
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------- Confección textil

rutasOrdenes.get('/confeccion', requierePermiso('confeccion.ver'), async (req, res, next) => {
  try {
    res.json(
      await ordenes.confeccionTextil(
        req.query.costurera ? Number(req.query.costurera) : undefined
      )
    );
  } catch (error) {
    next(error);
  }
});

// Nombres de trabajo ya usados, para sugerirlos al escribir.
rutasOrdenes.get('/nombres-trabajo', async (req, res, next) => {
  try {
    res.json(
      await ordenes.nombresDeTrabajo(
        req.query.clienteId ? Number(req.query.clienteId) : undefined
      )
    );
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Órdenes

rutasOrdenes.get('/ordenes', async (req, res, next) => {
  try {
    const u = req.usuario!;
    // Quien solo tiene ver_produccion no ve textil, bordado, DTF ni sellos.
    const limitado =
      !u.esAdmin &&
      !u.permisos.includes('ordenes.ver_todas') &&
      u.permisos.includes('ordenes.ver_produccion');

    res.json(
      await ordenes.dashboard({
        vendedorId: req.query.vendedor ? Number(req.query.vendedor) : undefined,
        tipoTrabajoId: req.query.tipo ? Number(req.query.tipo) : undefined,
        soloPorVencer: req.query.porVencer === 'true',
        soloSinTomar: req.query.sinTomar === 'true',
        misTrabajosDe: req.query.mios === 'true' ? u.id : undefined,
        soloProduccion: limitado,
        incluirFinalizadas: req.query.finalizadas === 'true',
        busqueda: (req.query.q as string) || undefined,
        campoBusqueda: (req.query.campo as 'CLIENTE' | 'ORDEN' | 'TELEFONO') || undefined,
      })
    );
  } catch (error) {
    next(error);
  }
});

// Esta va antes de '/ordenes/:id' para que 'numero' no se tome como un id.
rutasOrdenes.get('/ordenes/numero/:numero', async (req, res, next) => {
  try {
    res.json(await ordenes.porNumero(Number(req.params.numero)));
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.get('/ordenes/:id', async (req, res, next) => {
  try {
    res.json(await ordenes.obtener(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.post('/ordenes', requierePermiso('ordenes.crear'), async (req, res, next) => {
  try {
    const datos = esquemaOrden.parse(req.body);
    // Quien no anota pagos puede ingresar la orden igual, pero sin tocar
    // lo que el cliente dejo abonado.
    const u = req.usuario!;
    if (!u.esAdmin && !u.permisos.includes('pagos.registrar')) delete datos.pago;
    res.status(201).json(await ordenes.crear(datos, u.id));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Pagos

rutasOrdenes.get('/ordenes/:id/abonos', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [resumen, abonos] = await Promise.all([pagos.resumen(id), pagos.listar(id)]);
    res.json({ ...resumen, abonos });
  } catch (error) {
    next(error);
  }
});

rutasOrdenes.post(
  '/ordenes/:id/abonos',
  requierePermiso('pagos.registrar'),
  async (req, res, next) => {
    try {
      const datos = z
        .object({
          monto: z.number().positive().optional(),
          saldar: z.boolean().optional(),
          nota: z.string().trim().max(255).optional().nullable(),
        })
        .refine((d) => d.saldar === true || (d.monto ?? 0) > 0, {
          message: 'Indique el monto del abono',
        })
        .parse(req.body);
      res.status(201).json(await pagos.registrar(Number(req.params.id), datos, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

rutasOrdenes.delete(
  '/abonos/:id',
  requierePermiso('pagos.registrar'),
  async (req, res, next) => {
    try {
      res.json(await pagos.eliminar(Number(req.params.id), req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

// Datos de la orden con los nombres que usa el formulario, para volver a
// pedirla (?siguienteNumeracion=true) o para editarla.
rutasOrdenes.get('/ordenes/:id/plantilla', async (req, res, next) => {
  try {
    res.json(
      await ordenes.plantilla(
        Number(req.params.id),
        req.query.siguienteNumeracion === 'true'
      )
    );
  } catch (error) {
    next(error);
  }
});

// Qué se le ha cambiado a la orden, con quién lo hizo y cuándo.
rutasOrdenes.get('/ordenes/:id/cambios', async (req, res, next) => {
  try {
    res.json(await ordenes.cambiosDeOrden(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

// Edición completa: los datos de la orden y los campos de cada trabajo.
// El cliente y el vendedor no viajan a propósito: quedan como se registró.
rutasOrdenes.put(
  '/ordenes/:id/completa',
  requierePermiso('ordenes.editar'),
  async (req, res, next) => {
    try {
      const datos = esquemaOrden
        .omit({ clienteId: true, vendedorId: true, lineas: true })
        .extend({
          lineas: z
            .array(esquemaLinea.extend({ lineaId: z.number().int().positive() }))
            .min(1, 'La orden debe conservar sus trabajos'),
        })
        .parse(req.body);
      res.json(await ordenes.actualizarCompleta(Number(req.params.id), datos, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

rutasOrdenes.patch('/ordenes/:id', requierePermiso('ordenes.editar'), async (req, res, next) => {
  try {
    const datos = z
      .object({
        vendedorId: z.number().int().positive().optional(),
        observaciones: z.string().trim().optional().nullable(),
        urgente: z.boolean().optional(),
        motivoUrgencia: z.string().trim().max(200).optional().nullable(),
        fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        medioMuestra: z.enum(['WHATSAPP', 'EMAIL', 'VENDEDOR']).optional().nullable(),
        emailMuestra: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
      })
      .parse(req.body);
    res.json(await ordenes.actualizar(Number(req.params.id), datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Líneas

rutasOrdenes.post(
  '/lineas/:id/avanzar',
  requierePermiso('etapas.avanzar'),
  async (req, res, next) => {
    try {
      const datos = z
        .object({
          nota: z.string().trim().optional().nullable(),
          costureraId: z.number().int().positive().optional().nullable(),
          sinConfeccion: z.boolean().optional(),
          perfilImpresion: z.string().trim().max(120).optional().nullable(),
        })
        .parse(req.body ?? {});
      res.json(await ordenes.avanzarEtapa(Number(req.params.id), req.usuario!.id, datos));
    } catch (error) {
      next(error);
    }
  }
);

rutasOrdenes.patch(
  '/lineas/:id/precio',
  requierePermiso('ordenes.ver_precio'),
  async (req, res, next) => {
    try {
      const { precio } = z
        .object({ precio: z.number().nonnegative().nullable() })
        .parse(req.body);
      res.json(await ordenes.fijarPrecio(Number(req.params.id), precio));
    } catch (error) {
      next(error);
    }
  }
);

rutasOrdenes.patch(
  '/lineas/:id/costurera',
  requierePermiso('ordenes.editar', 'etapas.avanzar'),
  async (req, res, next) => {
    try {
      const datos = z
        .object({
          costureraId: z.number().int().positive().optional().nullable(),
          sinConfeccion: z.boolean().optional(),
        })
        .refine((d) => d.sinConfeccion === true || d.costureraId != null, {
          message: 'Indique la costurera o marque que no lleva confección',
        })
        .parse(req.body);
      res.json(await ordenes.cambiarCosturera(Number(req.params.id), datos));
    } catch (error) {
      next(error);
    }
  }
);

rutasOrdenes.post('/lineas/:id/tomar', requierePermiso('ordenes.tomar'), async (req, res, next) => {
  try {
    res.json(await ordenes.tomarLinea(Number(req.params.id), req.usuario!.id));
  } catch (error) {
    next(error);
  }
});