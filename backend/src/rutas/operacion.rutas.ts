import { Router } from 'express';
import { z } from 'zod';
import * as sellos from '../servicios/sellos.servicio.js';
import * as materiales from '../servicios/materiales.servicio.js';
import * as notificaciones from '../servicios/notificaciones.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';

export const rutasOperacion = Router();
rutasOperacion.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Sellos

rutasOperacion.get('/sellos', requierePermiso('sellos.ver'), async (req, res, next) => {
  try {
    res.json(
      await sellos.listar({
        tintaId: req.query.tinta ? Number(req.query.tinta) : undefined,
        busqueda: (req.query.q as string) || undefined,
        orden: (req.query.orden as string) || undefined,
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasOperacion.get('/sellos/resumen', requierePermiso('sellos.ver'), async (_req, res, next) => {
  try {
    res.json(await sellos.resumen());
  } catch (error) {
    next(error);
  }
});

rutasOperacion.get('/sellos/:id/movimientos', requierePermiso('sellos.ver'), async (req, res, next) => {
  try {
    res.json(await sellos.movimientos(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

const esquemaSello = z.object({
  codigo: z.string().trim().min(1, 'El código es obligatorio'),
  descripcion: z.string().trim().optional().nullable(),
  tintaId: z.number().int().positive('Seleccione el color de tinta'),
  cantidad: z.number().int().nonnegative(),
  minimo: z.number().int().nonnegative().optional(),
});

rutasOperacion.post('/sellos', requierePermiso('sellos.gestionar'), async (req, res, next) => {
  try {
    res.status(201).json(await sellos.crear(esquemaSello.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.post(
  '/sellos/:id/movimiento',
  requierePermiso('sellos.gestionar'),
  async (req, res, next) => {
    try {
      const datos = z
        .object({
          tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
          cantidad: z.number().int(),
          motivo: z.string().trim().optional(),
        })
        .parse(req.body);
      res.json(
        await sellos.mover(
          Number(req.params.id),
          datos.tipo,
          datos.cantidad,
          req.usuario!.id,
          datos.motivo
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

rutasOperacion.patch('/sellos/:id', requierePermiso('sellos.gestionar'), async (req, res, next) => {
  try {
    const datos = z
      .object({
        descripcion: z.string().trim().optional().nullable(),
        tintaId: z.number().int().optional(),
        minimo: z.number().int().nonnegative().optional(),
        activo: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(await sellos.actualizar(Number(req.params.id), datos));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Materiales

rutasOperacion.get('/materiales', requierePermiso('materiales.atender'), async (req, res, next) => {
  try {
    res.json(await materiales.listar({ estado: (req.query.estado as string) || undefined }));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.get('/materiales/mias', async (req, res, next) => {
  try {
    res.json(await materiales.listar({ usuarioId: req.usuario!.id }));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.get('/materiales/:id', async (req, res, next) => {
  try {
    res.json(await materiales.obtener(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.post('/materiales', requierePermiso('materiales.solicitar'), async (req, res, next) => {
  try {
    const datos = z
      .object({
        nota: z.string().trim().optional(),
        lineas: z
          .array(z.object({ cantidad: z.string().trim(), producto: z.string().trim() }))
          .min(1, 'Agregue al menos un producto'),
      })
      .parse(req.body);
    res.status(201).json(await materiales.crear(req.usuario!.id, datos.lineas, datos.nota));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.post(
  '/materiales/:id/estado',
  requierePermiso('materiales.atender'),
  async (req, res, next) => {
    try {
      const { estado } = z
        .object({ estado: z.enum(['PENDIENTE', 'APROBADA', 'COMPRADA', 'RECHAZADA']) })
        .parse(req.body);
      res.json(await materiales.cambiarEstado(Number(req.params.id), estado, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------- Notificaciones

rutasOperacion.get('/notificaciones', async (req, res, next) => {
  try {
    res.json(await notificaciones.listar(req.usuario!.id, req.query.noLeidas === 'true'));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.get('/notificaciones/contador', async (req, res, next) => {
  try {
    res.json(await notificaciones.contarNoLeidas(req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.post('/notificaciones/:id/leer', async (req, res, next) => {
  try {
    res.json(await notificaciones.marcarLeida(req.usuario!.id, Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasOperacion.post('/notificaciones/leer-todas', async (req, res, next) => {
  try {
    res.json(await notificaciones.marcarTodas(req.usuario!.id));
  } catch (error) {
    next(error);
  }
});