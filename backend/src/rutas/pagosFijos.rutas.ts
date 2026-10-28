import { Router } from 'express';
import { z } from 'zod';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';
import * as pagosFijos from '../servicios/pagosFijos.servicio.js';

export const rutasPagosFijos = Router();
// Todo el control de pagos es de administracion: un solo permiso para
// verlo y para manejarlo.
rutasPagosFijos.use(
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso('pagos_fijos.gestionar')
);

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

const esquemaPago = z.object({
  empresa: z.enum(pagosFijos.EMPRESAS, 'Indique la empresa'),
  descripcion: z.string().trim().min(3, 'Escriba qué se paga').max(160),
  frecuencia: z.enum(pagosFijos.FRECUENCIAS, 'Indique cada cuánto se paga'),
  dia1: z.number().int().min(1, 'El día va del 1 al 31').max(31, 'El día va del 1 al 31'),
  dia2: z.number().int().min(1).max(31).optional().nullable(),
  avisarDias: z
    .number()
    .int()
    .min(0, 'El aviso va de 0 a 30 días')
    .max(30, 'El aviso va de 0 a 30 días')
    .optional()
    .nullable(),
  notas: z.string().trim().max(255).optional().nullable(),
  desde: fecha.optional().nullable(),
});

rutasPagosFijos.get('/', async (req, res, next) => {
  try {
    const empresa = pagosFijos.EMPRESAS.includes(req.query.empresa as any)
      ? (req.query.empresa as pagosFijos.Empresa)
      : 'IMPRENTA';
    res.json({
      empresa,
      hoy: pagosFijos.hoyEnTexto(),
      pagos: await pagosFijos.listar(empresa, req.query.inactivos === 'true'),
    });
  } catch (error) {
    next(error);
  }
});

// Todo lo pagado en una empresa: la vista de Historial.
rutasPagosFijos.get('/historial', async (req, res, next) => {
  try {
    const empresa = pagosFijos.EMPRESAS.includes(req.query.empresa as any)
      ? (req.query.empresa as pagosFijos.Empresa)
      : 'IMPRENTA';
    const mes = typeof req.query.mes === 'string' && /^\d{4}-\d{2}$/.test(req.query.mes)
      ? req.query.mes
      : null;
    res.json(
      await pagosFijos.historialDeEmpresa(empresa, {
        mes,
        busqueda: typeof req.query.q === 'string' ? req.query.q : null,
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.get('/:id/historial', async (req, res, next) => {
  try {
    res.json(await pagosFijos.historial(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.post('/', async (req, res, next) => {
  try {
    const datos = esquemaPago.parse(req.body);
    res.status(201).json(await pagosFijos.crear(datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.put('/:id', async (req, res, next) => {
  try {
    const datos = esquemaPago.parse(req.body);
    res.json(await pagosFijos.actualizar(Number(req.params.id), datos));
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.delete('/:id', async (req, res, next) => {
  try {
    res.json(await pagosFijos.quitar(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.post('/:id/reactivar', async (req, res, next) => {
  try {
    res.json(await pagosFijos.reactivar(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------- "Ya pagó"

rutasPagosFijos.post('/:id/pagos', async (req, res, next) => {
  try {
    const datos = z
      .object({
        periodo: fecha,
        pagadoEn: fecha.optional().nullable(),
        comprobante: z.string().trim().min(1, 'Escriba el número de comprobante').max(60),
        nota: z.string().trim().max(255).optional().nullable(),
      })
      .parse(req.body);
    res.status(201).json(await pagosFijos.anotarPago(Number(req.params.id), datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasPagosFijos.delete('/pagos/:registroId', async (req, res, next) => {
  try {
    res.json(await pagosFijos.borrarPago(Number(req.params.registroId)));
  } catch (error) {
    next(error);
  }
});
