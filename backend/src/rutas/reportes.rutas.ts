import { Router } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import * as reportes from '../servicios/reportes.servicio.js';
import * as archivos from '../servicios/archivos.servicio.js';
import * as whatsapp from '../servicios/whatsapp.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';
import { ErrorHttp } from '../util/errores.js';

export const rutasReportes = Router();
rutasReportes.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Subida de muestras

const almacen = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, archivos.CARPETA_SUBIDAS),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
  },
});

const subida = multer({
  storage: almacen,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) return cb(null, true);
    cb(new ErrorHttp(400, 'Solo se aceptan imágenes JPG o PNG') as any);
  },
});

rutasReportes.post(
  '/lineas/:id/archivos',
  requierePermiso('archivos.subir'),
  subida.single('imagen'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new ErrorHttp(400, 'No se recibió ninguna imagen');
      res.status(201).json(
        await archivos.registrar({
          lineaId: Number(req.params.id),
          nombreArchivo: req.file.originalname,
          ruta: req.file.filename,
          mime: req.file.mimetype,
          bytes: req.file.size,
          subidoPor: req.usuario!.id,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

rutasReportes.get('/lineas/:id/archivos', async (req, res, next) => {
  try {
    res.json(await archivos.listar(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasReportes.get('/archivos/:id', async (req, res, next) => {
  try {
    const archivo = await archivos.obtenerRuta(Number(req.params.id));
    res.sendFile(path.join(archivos.CARPETA_SUBIDAS, archivo.ruta));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Reportes

const rango = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

rutasReportes.get('/reportes/bitacora', requierePermiso('bitacora.ver'), async (req, res, next) => {
  try {
    const filtros = rango.parse(req.query);
    res.json(
      await reportes.bitacora({
        ...filtros,
        usuarioId: req.query.usuario ? Number(req.query.usuario) : undefined,
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasReportes.get(
  '/reportes/trabajadores',
  requierePermiso('bitacora.ver'),
  async (req, res, next) => {
    try {
      res.json(await reportes.resumenTrabajadores(rango.parse(req.query)));
    } catch (error) {
      next(error);
    }
  }
);

rutasReportes.get('/reportes/tipos', requierePermiso('reportes.generar'), async (req, res, next) => {
  try {
    res.json(await reportes.porTipoTrabajo(rango.parse(req.query)));
  } catch (error) {
    next(error);
  }
});

rutasReportes.get(
  '/reportes/vendedores',
  requierePermiso('reportes.generar'),
  async (req, res, next) => {
    try {
      res.json(await reportes.porVendedor(rango.parse(req.query)));
    } catch (error) {
      next(error);
    }
  }
);

rutasReportes.get('/reportes/estancadas', async (req, res, next) => {
  try {
    res.json(await reportes.estancadas(req.query.dias ? Number(req.query.dias) : 7));
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- WhatsApp

rutasReportes.get('/whatsapp/pendientes', async (_req, res, next) => {
  try {
    res.json(await whatsapp.pendientes());
  } catch (error) {
    next(error);
  }
});

rutasReportes.post('/whatsapp/:id/enviado', async (req, res, next) => {
  try {
    res.json(await whatsapp.marcarEnviado(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasReportes.post('/whatsapp/:id/cancelar', async (req, res, next) => {
  try {
    res.json(await whatsapp.cancelar(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});