import { Router } from 'express';
import { z } from 'zod';
import { login, cambiarPassword } from '../servicios/auth.servicio.js';
import { autenticar } from '../middleware/autenticar.js';

export const rutasAuth = Router();

const esquemaLogin = z.object({
  cedula: z.string().trim().min(1, 'La cédula es obligatoria'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

rutasAuth.post('/login', async (req, res, next) => {
  try {
    const datos = esquemaLogin.parse(req.body);
    const resultado = await login(datos.cedula, datos.password, req.ip);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

const esquemaCambio = z.object({
  actual: z.string().min(1, 'Debe indicar su contraseña actual'),
  nueva: z
    .string()
    .min(8, 'La contraseña nueva debe tener al menos 8 caracteres')
    .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});

rutasAuth.post('/cambiar-password', autenticar, async (req, res, next) => {
  try {
    const datos = esquemaCambio.parse(req.body);
    await cambiarPassword(req.usuario!.id, datos.actual, datos.nueva);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
});

rutasAuth.get('/yo', autenticar, (req, res) => {
  res.json(req.usuario);
});