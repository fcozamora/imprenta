import { Router } from 'express';
import { z } from 'zod';
import * as camisetas from '../servicios/camisetas.servicio.js';
import * as trali from '../servicios/trali.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';

export const rutasExtras = Router();
rutasExtras.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Camisetas

const esquemaPedido = z.object({
  fechaRequerida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique la fecha que necesita'),
  clienteId: z.number().int().positive().optional().nullable(),
  nota: z.string().trim().max(255).optional().nullable(),
  lineas: z
    .array(
      z.object({
        descripcion: z.string().trim().min(2, 'Cada línea necesita una descripción'),
        cantidades: z.record(z.string(), z.number().int().nonnegative()),
      })
    )
    .min(1, 'Agregue al menos una línea'),
});

rutasExtras.get('/camisetas', requierePermiso('camisetas.atender'), async (req, res, next) => {
  try {
    res.json(await camisetas.listar({ estado: (req.query.estado as string) || undefined }));
  } catch (error) {
    next(error);
  }
});

rutasExtras.get('/camisetas/mios', async (req, res, next) => {
  try {
    res.json(await camisetas.listar({ usuarioId: req.usuario!.id }));
  } catch (error) {
    next(error);
  }
});

rutasExtras.get('/camisetas/:id', async (req, res, next) => {
  try {
    res.json(await camisetas.obtener(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasExtras.post('/camisetas', requierePermiso('camisetas.solicitar'), async (req, res, next) => {
  try {
    const datos = esquemaPedido.parse(req.body);
    res.status(201).json(await camisetas.crear(req.usuario!.id, datos));
  } catch (error) {
    next(error);
  }
});

rutasExtras.post(
  '/camisetas/:id/estado',
  requierePermiso('camisetas.atender'),
  async (req, res, next) => {
    try {
      const { estado } = z
        .object({ estado: z.enum(['PENDIENTE', 'APROBADO', 'ENTREGADO', 'RECHAZADO']) })
        .parse(req.body);
      res.json(await camisetas.cambiarEstado(Number(req.params.id), estado, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------- Trali

const esquemaEncomienda = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique la fecha'),
  direccion: z.enum(['ENVIADA', 'RECIBIDA']),
  numeroGuia: z.string().trim().max(30).optional().nullable(),
  status: z.enum(['CONTADO', 'POR_COBRAR']).optional().nullable(),
  monto: z.number().nonnegative().optional().nullable(),
  personaEnvia: z.string().trim().max(120).optional().nullable(),
  personaRecibe: z.string().trim().max(120).optional().nullable(),
  destino: z.string().trim().max(120).optional().nullable(),
  retiradoPor: z.string().trim().max(120).optional().nullable(),
  notas: z.string().trim().max(255).optional().nullable(),
});

rutasExtras.get('/trali', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    res.json(
      await trali.listar({
        direccion: (req.query.direccion as 'ENVIADA' | 'RECIBIDA') || undefined,
        desde: (req.query.desde as string) || undefined,
        hasta: (req.query.hasta as string) || undefined,
        busqueda: (req.query.q as string) || undefined,
        incluirEntregadas: req.query.entregadas === 'true',
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasExtras.get('/trali/resumen', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    res.json(
      await trali.resumen({
        desde: (req.query.desde as string) || undefined,
        hasta: (req.query.hasta as string) || undefined,
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasExtras.post('/trali/:id/entregar', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    const { retiradoPor } = z
      .object({ retiradoPor: z.string().trim().max(120).optional().nullable() })
      .parse(req.body ?? {});
    res.json(await trali.entregar(Number(req.params.id), req.usuario!.id, retiradoPor));
  } catch (error) {
    next(error);
  }
});

rutasExtras.post('/trali', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    res.status(201).json(await trali.crear(esquemaEncomienda.parse(req.body), req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasExtras.patch('/trali/:id', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    const datos = esquemaEncomienda.partial().parse(req.body);
    res.json(await trali.actualizar(Number(req.params.id), datos));
  } catch (error) {
    next(error);
  }
});

rutasExtras.delete('/trali/:id', requierePermiso('trali.gestionar'), async (req, res, next) => {
  try {
    res.json(await trali.eliminar(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});