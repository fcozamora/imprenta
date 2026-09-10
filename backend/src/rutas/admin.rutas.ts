import { Router } from 'express';
import { z } from 'zod';
import * as usuarios from '../servicios/usuarios.servicio.js';
import * as puestos from '../servicios/puestos.servicio.js';
import {
  autenticar,
  exigirPasswordDefinitiva,
  requierePermiso,
} from '../middleware/autenticar.js';

export const rutasAdmin = Router();

// Todo este módulo exige sesión activa y contraseña ya cambiada.
rutasAdmin.use(autenticar, exigirPasswordDefinitiva);

// ---------------------------------------------------------------- Usuarios

rutasAdmin.get('/usuarios', requierePermiso('usuarios.gestionar'), async (req, res, next) => {
  try {
    res.json(
      await usuarios.listar({
        puestoId: req.query.puesto ? Number(req.query.puesto) : undefined,
        activo: req.query.activo === undefined ? undefined : req.query.activo === 'true',
        busqueda: req.query.q as string | undefined,
      })
    );
  } catch (error) {
    next(error);
  }
});

rutasAdmin.get('/usuarios/:id', requierePermiso('usuarios.gestionar'), async (req, res, next) => {
  try {
    res.json(await usuarios.obtener(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

const esquemaUsuario = z.object({
  cedula: z.string().trim().min(5, 'La cédula debe tener al menos 5 caracteres'),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio'),
  apellido: z.string().trim().min(2, 'El apellido es obligatorio'),
  puestoId: z.number().int().positive('Debe seleccionar un puesto'),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().email('Correo inválido').optional().nullable(),
  esAdmin: z.boolean().optional(),
});

rutasAdmin.post('/usuarios', requierePermiso('usuarios.gestionar'), async (req, res, next) => {
  try {
    const datos = esquemaUsuario.parse(req.body);
    res.status(201).json(await usuarios.crear(datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasAdmin.patch('/usuarios/:id', requierePermiso('usuarios.gestionar'), async (req, res, next) => {
  try {
    const datos = esquemaUsuario.partial().parse(req.body);
    res.json(await usuarios.actualizar(Number(req.params.id), datos, req.usuario!.id));
  } catch (error) {
    next(error);
  }
});

rutasAdmin.post(
  '/usuarios/:id/resetear-password',
  requierePermiso('usuarios.gestionar'),
  async (req, res, next) => {
    try {
      res.json(await usuarios.resetearPassword(Number(req.params.id), req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

rutasAdmin.post(
  '/usuarios/:id/estado',
  requierePermiso('usuarios.gestionar'),
  async (req, res, next) => {
    try {
      const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
      res.json(await usuarios.cambiarEstado(Number(req.params.id), activo, req.usuario!.id));
    } catch (error) {
      next(error);
    }
  }
);

rutasAdmin.post(
  '/usuarios/:id/desbloquear',
  requierePermiso('usuarios.gestionar'),
  async (req, res, next) => {
    try {
      res.json(await usuarios.desbloquear(Number(req.params.id)));
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------- Puestos

rutasAdmin.get('/puestos', async (req, res, next) => {
  try {
    res.json(await puestos.listar(req.query.activos === 'true'));
  } catch (error) {
    next(error);
  }
});

rutasAdmin.get('/permisos', requierePermiso('puestos.gestionar'), async (_req, res, next) => {
  try {
    res.json(await puestos.listarPermisos());
  } catch (error) {
    next(error);
  }
});

const esquemaPuesto = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .regex(/^[A-Z_]+$/, 'Solo letras mayúsculas y guion bajo'),
  nombre: z.string().trim().min(3),
  descripcion: z.string().trim().optional().nullable(),
  permisos: z.array(z.string()).optional(),
});

rutasAdmin.post('/puestos', requierePermiso('puestos.gestionar'), async (req, res, next) => {
  try {
    res.status(201).json(await puestos.crear(esquemaPuesto.parse(req.body)));
  } catch (error) {
    next(error);
  }
});

rutasAdmin.patch('/puestos/:id', requierePermiso('puestos.gestionar'), async (req, res, next) => {
  try {
    const datos = z
      .object({
        nombre: z.string().trim().min(3).optional(),
        descripcion: z.string().trim().optional().nullable(),
        activo: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(await puestos.actualizar(Number(req.params.id), datos));
  } catch (error) {
    next(error);
  }
});

rutasAdmin.put(
  '/puestos/:id/permisos',
  requierePermiso('puestos.gestionar'),
  async (req, res, next) => {
    try {
      const { permisos } = z.object({ permisos: z.array(z.string()) }).parse(req.body);
      res.json(await puestos.asignarPermisos(Number(req.params.id), permisos));
    } catch (error) {
      next(error);
    }
  }
);