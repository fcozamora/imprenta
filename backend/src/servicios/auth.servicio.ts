import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { ErrorHttp } from '../util/errores.js';

const RONDAS_BCRYPT = 12;
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export interface UsuarioSesion {
  id: number;
  cedula: string;
  nombre: string;
  puestoId: number;
  puesto: string;
  esAdmin: boolean;
  permisos: string[];
  requiereCambioPassword: boolean;
}

/** Carga el usuario con sus permisos. Devuelve null si no existe o está inactivo. */
export async function cargarUsuario(id: number): Promise<UsuarioSesion | null> {
  const [filas] = await pool.query(
    `SELECT u.id, u.cedula, u.nombre_completo, u.puesto_id, u.es_admin,
            u.requiere_cambio_password, p.nombre AS puesto,
            COALESCE(GROUP_CONCAT(pp.permiso_codigo), '') AS permisos
       FROM usuarios u
       JOIN puestos p ON p.id = u.puesto_id
       LEFT JOIN puesto_permisos pp ON pp.puesto_id = u.puesto_id
      WHERE u.id = ? AND u.activo = 1
      GROUP BY u.id`,
    [id]
  );
  const u = (filas as any[])[0];
  if (!u) return null;

  return {
    id: u.id,
    cedula: u.cedula,
    nombre: u.nombre_completo,
    puestoId: u.puesto_id,
    puesto: u.puesto,
    esAdmin: !!u.es_admin,
    permisos: u.permisos ? String(u.permisos).split(',') : [],
    requiereCambioPassword: !!u.requiere_cambio_password,
  };
}

function firmarToken(u: UsuarioSesion): string {
  return jwt.sign({ sub: String(u.id), cedula: u.cedula }, env.jwtSecret, {
    expiresIn: env.jwtExpira as any,
  });
}

export async function login(cedula: string, password: string, ip?: string) {
  const [filas] = await pool.query(
    `SELECT id, password_hash, activo, intentos_fallidos, bloqueado_hasta
       FROM usuarios WHERE cedula = ?`,
    [cedula]
  );
  const fila = (filas as any[])[0];

  // Mismo mensaje si no existe o si la clave está mal: no revelamos cuáles cédulas existen.
  if (!fila) throw new ErrorHttp(401, 'Cédula o contraseña incorrecta');

  if (!fila.activo) {
    throw new ErrorHttp(403, 'La cuenta está desactivada. Consulte al administrador.');
  }

  if (fila.bloqueado_hasta && new Date(fila.bloqueado_hasta) > new Date()) {
    throw new ErrorHttp(
      423,
      `Cuenta bloqueada por intentos fallidos. Intente en unos minutos.`,
      'BLOQUEADA'
    );
  }

  const correcta = await bcrypt.compare(password, fila.password_hash);

  if (!correcta) {
    const intentos = fila.intentos_fallidos + 1;
    if (intentos >= MAX_INTENTOS) {
      await pool.query(
        `UPDATE usuarios
            SET intentos_fallidos = 0,
                bloqueado_hasta = NOW() + INTERVAL ? MINUTE
          WHERE id = ?`,
        [BLOQUEO_MINUTOS, fila.id]
      );
      throw new ErrorHttp(423, 'Cuenta bloqueada por intentos fallidos.', 'BLOQUEADA');
    }
    await pool.query(`UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?`, [
      intentos,
      fila.id,
    ]);
    throw new ErrorHttp(401, 'Cédula o contraseña incorrecta');
  }

  await pool.query(
    `UPDATE usuarios
        SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW()
      WHERE id = ?`,
    [fila.id]
  );

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_despues)
     VALUES ('usuarios', ?, 'LOGIN', ?, JSON_OBJECT('ip', ?))`,
    [fila.id, fila.id, ip ?? null]
  );

  const usuario = await cargarUsuario(fila.id);
  if (!usuario) throw new ErrorHttp(500, 'No se pudo cargar el usuario');

  return { token: firmarToken(usuario), usuario };
}

export async function cambiarPassword(
  usuarioId: number,
  actual: string,
  nueva: string
) {
  const [filas] = await pool.query(
    `SELECT password_hash FROM usuarios WHERE id = ?`,
    [usuarioId]
  );
  const fila = (filas as any[])[0];
  if (!fila) throw new ErrorHttp(404, 'Usuario no encontrado');

  const correcta = await bcrypt.compare(actual, fila.password_hash);
  if (!correcta) throw new ErrorHttp(400, 'La contraseña actual no es correcta');

  if (nueva === actual) {
    throw new ErrorHttp(400, 'La contraseña nueva debe ser distinta a la actual');
  }
  if (nueva === env.passwordReset) {
    throw new ErrorHttp(400, 'No puede usar la contraseña temporal del sistema');
  }

  const hash = await bcrypt.hash(nueva, RONDAS_BCRYPT);
  await pool.query(
    `UPDATE usuarios
        SET password_hash = ?, requiere_cambio_password = 0
      WHERE id = ?`,
    [hash, usuarioId]
  );

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id)
     VALUES ('usuarios', ?, 'RESET_PASSWORD', ?)`,
    [usuarioId, usuarioId]
  );
}