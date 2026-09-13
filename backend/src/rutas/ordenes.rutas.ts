import { Router } from 'express';
import { z } from 'zod';
import * as ordenes from '../servicios/ordenes.servicio.js';
import * as costureras from '../servicios/costureras.servicio.js';
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
  medioMuestra: z.enum(['WHATSAPP', 'EMAIL']).optional().nullable(),
  emailMuestra: z
    .string()
    .email('El correo de la muestra no es válido')
    .optional()
    .nullable()
    .or(z.literal('')),
  observaciones: z.string().trim().optional().nullable(),
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

// ---------------------------------------------------------------- Órdenes

rutasOrdenes.get('/ordenes', async (req, res, next) => {
  try {
    res.json(
      await ordenes.dashboard({
        vendedorId: req.query.vendedor ? Number(req.query.vendedor) : undefined,
        tipoTrabajoId: req.query.tipo ? Number(req.query.tipo) : undefined,
        soloPorVencer: req.query.porVencer === 'true',
        soloSinTomar: req.query.sinTomar === 'true',
        incluirFinalizadas: req.query.finalizadas === 'true',
        busqueda: (req.query.q as string) || undefined,
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
    res.status(201).json(await ordenes.crear(datos, req.usuario!.id));
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
          nota: z.string().trim().optional(),
          costureraId: z.number().int().positive().optional().nullable(),
        })
        .parse(req.body ?? {});
      res.json(
        await ordenes.avanzarEtapa(
          Number(req.params.id),
          req.usuario!.id,
          datos.nota,
          datos.costureraId
        )
      );
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