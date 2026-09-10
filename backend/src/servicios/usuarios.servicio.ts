import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { ErrorHttp } from '../util/errores.js';

const RONDAS_BCRYPT = 12;

export interface DatosUsuario {
  cedula: string;
  nombre: string;
  apellido: string;
  puestoId: number;
  telefono?: string | null;
  email?: string | null;
  esAdmin?: boolean;
}

export async function listar(filtros: { puestoId?: number; activo?: boolean; busqueda?: string }) {
  const condiciones: string[] = [];
  const valores: any[] = [];

  if (filtros.puestoId) {
    condiciones.push('u.puesto_id = ?');
    valores.push(filtros.puestoId);
  }
  if (filtros.activo !== undefined) {
    condiciones.push('u.activo = ?');
    valores.push(filtros.activo ? 1 : 0);
  }
  if (filtros.busqueda) {
    condiciones.push('(u.cedula LIKE ? OR u.nombre_completo LIKE ?)');
    valores.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT u.id, u.cedula, u.nombre, u.apellido, u.nombre_completo,
            u.puesto_id, p.nombre AS puesto, u.telefono, u.email,
            u.es_admin, u.activo, u.requiere_cambio_password,
            u.ultimo_acceso, u.bloqueado_hasta, u.creado_en
       FROM usuarios u
       JOIN puestos p ON p.id = u.puesto_id
       ${where}
      ORDER BY u.activo DESC, u.apellido, u.nombre`,
    valores
  );
  return filas;
}

export async function obtener(id: number) {
  const [filas] = await pool.query(
    `SELECT u.id, u.cedula, u.nombre, u.apellido, u.nombre_completo,
            u.puesto_id, p.nombre AS puesto, u.telefono, u.email,
            u.es_admin, u.activo, u.requiere_cambio_password, u.ultimo_acceso
       FROM usuarios u
       JOIN puestos p ON p.id = u.puesto_id
      WHERE u.id = ?`,
    [id]
  );
  const usuario = (filas as any[])[0];
  if (!usuario) throw new ErrorHttp(404, 'Usuario no encontrado');
  return usuario;
}

export async function crear(datos: DatosUsuario, creadoPor: number) {
  const [existe] = await pool.query(`SELECT id FROM usuarios WHERE cedula = ?`, [datos.cedula]);
  if ((existe as any[]).length) {
    throw new ErrorHttp(409, 'Ya existe un usuario con esa cédula');
  }

  const [puesto] = await pool.query(`SELECT id FROM puestos WHERE id = ? AND activo = 1`, [
    datos.puestoId,
  ]);
  if (!(puesto as any[]).length) {
    throw new ErrorHttp(400, 'El puesto indicado no existe o está inactivo');
  }

  // Toda cuenta nueva arranca con la clave temporal y el cambio obligatorio.
  const hash = await bcrypt.hash(env.passwordReset, RONDAS_BCRYPT);

  const [resultado] = await pool.query(
    `INSERT INTO usuarios
       (cedula, nombre, apellido, puesto_id, password_hash,
        requiere_cambio_password, es_admin, telefono, email, creado_por)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      datos.cedula,
      datos.nombre,
      datos.apellido,
      datos.puestoId,
      hash,
      datos.esAdmin ? 1 : 0,
      datos.telefono ?? null,
      datos.email ?? null,
      creadoPor,
    ]
  );

  const id = (resultado as any).insertId;

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_despues)
     VALUES ('usuarios', ?, 'INSERT', ?, JSON_OBJECT('cedula', ?, 'puesto_id', ?))`,
    [id, creadoPor, datos.cedula, datos.puestoId]
  );

  return { ...(await obtener(id)), passwordTemporal: env.passwordReset };
}

export async function actualizar(id: number, datos: Partial<DatosUsuario>, actualizadoPor: number) {
  const antes = await obtener(id);

  if (datos.cedula && datos.cedula !== antes.cedula) {
    const [existe] = await pool.query(`SELECT id FROM usuarios WHERE cedula = ? AND id <> ?`, [
      datos.cedula,
      id,
    ]);
    if ((existe as any[]).length) {
      throw new ErrorHttp(409, 'Ya existe otro usuario con esa cédula');
    }
  }

  await pool.query(
    `UPDATE usuarios
        SET cedula = COALESCE(?, cedula),
            nombre = COALESCE(?, nombre),
            apellido = COALESCE(?, apellido),
            puesto_id = COALESCE(?, puesto_id),
            telefono = COALESCE(?, telefono),
            email = COALESCE(?, email),
            es_admin = COALESCE(?, es_admin)
      WHERE id = ?`,
    [
      datos.cedula ?? null,
      datos.nombre ?? null,
      datos.apellido ?? null,
      datos.puestoId ?? null,
      datos.telefono ?? null,
      datos.email ?? null,
      datos.esAdmin === undefined ? null : datos.esAdmin ? 1 : 0,
      id,
    ]
  );

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_antes)
     VALUES ('usuarios', ?, 'UPDATE', ?, JSON_OBJECT('cedula', ?, 'puesto_id', ?))`,
    [id, actualizadoPor, antes.cedula, antes.puesto_id]
  );

  return obtener(id);
}

/** Devuelve la cuenta a la clave temporal y obliga a cambiarla al ingresar. */
export async function resetearPassword(id: number, hechoPor: number) {
  await obtener(id);

  const hash = await bcrypt.hash(env.passwordReset, RONDAS_BCRYPT);
  await pool.query(
    `UPDATE usuarios
        SET password_hash = ?, requiere_cambio_password = 1,
            intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE id = ?`,
    [hash, id]
  );

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id)
     VALUES ('usuarios', ?, 'RESET_PASSWORD', ?)`,
    [id, hechoPor]
  );

  return { mensaje: 'Contraseña restablecida', passwordTemporal: env.passwordReset };
}

export async function cambiarEstado(id: number, activo: boolean, hechoPor: number) {
  if (id === hechoPor && !activo) {
    throw new ErrorHttp(400, 'No puede desactivar su propia cuenta');
  }
  await obtener(id);

  await pool.query(`UPDATE usuarios SET activo = ? WHERE id = ?`, [activo ? 1 : 0, id]);

  if (!activo) {
    await pool.query(`UPDATE sesiones SET revocada_en = NOW() WHERE usuario_id = ? AND revocada_en IS NULL`, [id]);
  }

  await pool.query(
    `INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos_despues)
     VALUES ('usuarios', ?, 'UPDATE', ?, JSON_OBJECT('activo', ?))`,
    [id, hechoPor, activo ? 1 : 0]
  );

  return obtener(id);
}

export async function desbloquear(id: number) {
  await obtener(id);
  await pool.query(
    `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?`,
    [id]
  );
  return { mensaje: 'Cuenta desbloqueada' };
}