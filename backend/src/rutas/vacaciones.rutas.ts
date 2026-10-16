import { Router } from 'express';
import { z } from 'zod';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';
import * as vacaciones from '../servicios/vacaciones.servicio.js';

export const rutasVacaciones = Router();
rutasVacaciones.use(autenticar, exigirPasswordDefinitiva);

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

const esquemaSolicitud = z.object({
  fechaInicio: fecha,
  fechaFin: fecha,
  medioDia: z.boolean().optional(),
  motivo: z.string().trim().max(255).optional().nullable(),
});

// ------------------------------------------------- Lo propio de cada quien

/**
 * Las solicitudes propias, con su estado. A proposito no devuelve el saldo:
 * cuantos dias le quedan a cada quien lo maneja administracion.
 */
rutasVacaciones.get('/vacaciones/mias', async (req, res, next) => {
  try {
    res.json(await vacaciones.listar({ usuarioId: req.usuario!.id }));
  } catch (error) {
    next(error);
  }
});

rutasVacaciones.post(
  '/vacaciones',
  requierePermiso('vacaciones.solicitar'),
  async (req, res, next) => {
    try {
      const datos = esquemaSolicitud.parse(req.body);
      res.status(201).json(await vacaciones.solicitar(req.usuario!.id, datos));
    } catch (error) {
      next(error);
    }
  }
);

rutasVacaciones.post('/vacaciones/:id/cancelar', async (req, res, next) => {
  try {
    res.json(await vacaciones.cancelar(Number(req.params.id), req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------- Administracion

rutasVacaciones.get(
  '/vacaciones',
  requierePermiso('vacaciones.gestionar'),
  async (req, res, next) => {
    try {
      res.json(
        await vacaciones.listar({
          estado: typeof req.query.estado === 'string' ? req.query.estado : undefined,
          usuarioId: req.query.usuarioId ? Number(req.query.usuarioId) : undefined,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

rutasVacaciones.get(
  '/vacaciones/saldos',
  requierePermiso('vacaciones.gestionar'),
  async (_req, res, next) => {
    try {
      res.json(await vacaciones.saldos());
    } catch (error) {
      next(error);
    }
  }
);

rutasVacaciones.put(
  '/vacaciones/saldos/:usuarioId',
  requierePermiso('vacaciones.gestionar'),
  async (req, res, next) => {
    try {
      const { dias, nota } = z
        .object({
          dias: z.number().min(0).max(365),
          nota: z.string().trim().max(200).optional().nullable(),
        })
        .parse(req.body);
      res.json(
        await vacaciones.fijarDias(Number(req.params.usuarioId), dias, nota ?? null, req.usuario!.id)
      );
    } catch (error) {
      next(error);
    }
  }
);

rutasVacaciones.post(
  '/vacaciones/:id/resolver',
  requierePermiso('vacaciones.gestionar'),
  async (req, res, next) => {
    try {
      const datos = z
        .object({
          estado: z.enum(['APROBADA', 'RECHAZADA']),
          fechaInicio: fecha.optional().nullable(),
          fechaFin: fecha.optional().nullable(),
          medioDia: z.boolean().optional().nullable(),
          nota: z.string().trim().max(255).optional().nullable(),
        })
        .parse(req.body);
      res.json(await vacaciones.resolver(Number(req.params.id), datos, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);
