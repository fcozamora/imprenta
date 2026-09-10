import { Router } from 'express';
import { z } from 'zod';
import * as clientes from '../servicios/clientes.servicio.js';
import * as catalogos from '../servicios/catalogos.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';

export const rutasClientes = Router();
rutasClientes.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Catálogos

rutasClientes.get('/catalogos', async (_req, res, next) => {
  try {
    res.json(await catalogos.todos());
  } catch (error) {
    next(error);
  }
});

rutasClientes.get('/catalogos/flujo/:tipoId', async (req, res, next) => {
  try {
    res.json(
      await catalogos.flujoDe(Number(req.params.tipoId), req.query.sinCambios === 'true')
    );
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------- Clientes

/** Autorrelleno: devuelve null si la cédula no existe, sin error. */
rutasClientes.get('/clientes/cedula/:cedula', async (req, res, next) => {
  try {
    res.json(await clientes.porCedula(req.params.cedula.trim()));
  } catch (error) {
    next(error);
  }
});

rutasClientes.get('/clientes', async (req, res, next) => {
  try {
    const termino = ((req.query.q as string) ?? '').trim();
    if (termino.length < 2) return res.json([]);
    res.json(await clientes.buscar(termino));
  } catch (error) {
    next(error);
  }
});

rutasClientes.get('/clientes/:id', async (req, res, next) => {
  try {
    res.json(await clientes.obtener(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasClientes.get('/clientes/:id/productos', async (req, res, next) => {
  try {
    res.json(await clientes.productos(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

rutasClientes.get('/clientes/:id/ordenes', async (req, res, next) => {
  try {
    res.json(await clientes.ordenes(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

const esquemaCliente = z.object({
  cedula: z.string().trim().min(5, 'La cédula es obligatoria'),
  nombre: z.string().trim().min(3, 'El nombre del cliente es obligatorio'),
  nombreComercial: z.string().trim().optional().nullable(),
  telefono: z.string().trim().min(8, 'El teléfono es obligatorio'),
  telefonoWa: z.string().trim().optional().nullable(),
  emailFacturacion: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
  notas: z.string().trim().optional().nullable(),
});

rutasClientes.post('/clientes', requierePermiso('clientes.gestionar'), async (req, res, next) => {
  try {
    const datos = esquemaCliente.parse(req.body);
    res.status(201).json(await clientes.crear(datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasClientes.patch(
  '/clientes/:id',
  requierePermiso('clientes.gestionar'),
  async (req, res, next) => {
    try {
      const datos = esquemaCliente.partial().parse(req.body);
      res.json(await clientes.actualizar(Number(req.params.id), datos, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);