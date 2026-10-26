import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ErrorHttp } from '../util/errores.js';
import { cargarUsuario } from '../servicios/auth.servicio.js';

/** Verifica el token y adjunta el usuario a la petición. */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  try {
    const encabezado = req.headers.authorization;
    if (!encabezado?.startsWith('Bearer ')) {
      throw new ErrorHttp(401, 'Sesión no iniciada', 'SIN_TOKEN');
    }

    let carga: any;
    try {
      carga = jwt.verify(encabezado.slice(7), env.jwtSecret);
    } catch {
      throw new ErrorHttp(401, 'La sesión expiró. Vuelva a iniciar sesión.', 'TOKEN_INVALIDO');
    }

    // Se recarga de la base en cada petición: si el administrador desactiva
    // al usuario o le cambia el puesto, aplica de inmediato.
    const usuario = await cargarUsuario(Number(carga.sub));
    if (!usuario) throw new ErrorHttp(401, 'La cuenta ya no está disponible');

    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}

/** Bloquea todo hasta que el usuario cambie su contraseña inicial. */
export function exigirPasswordDefinitiva(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.usuario?.requiereCambioPassword) {
    return next(
      new ErrorHttp(403, 'Debe cambiar su contraseña antes de continuar', 'CAMBIO_REQUERIDO')
    );
  }
  next();
}

/**
 * ¿Tiene el usuario alguno de estos permisos? El administrador siempre sí.
 * Es la misma pregunta que hace requierePermiso, pero para cuando la
 * respuesta no bloquea la petición sino que decide qué se devuelve.
 */
export function tienePermiso(
  usuario: Request['usuario'],
  ...codigos: string[]
): boolean {
  if (!usuario) return false;
  if (usuario.esAdmin) return true;
  return codigos.some((c) => usuario.permisos.includes(c));
}

/** Exige al menos uno de los permisos indicados. El administrador pasa siempre. */
export function requierePermiso(...codigos: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const u = req.usuario;
    if (!u) return next(new ErrorHttp(401, 'Sesión no iniciada'));
    if (tienePermiso(u, ...codigos)) return next();
    next(new ErrorHttp(403, 'No tiene permiso para esta acción'));
  };
}