import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: '-06:00',
  dateStrings: ['DATE'],
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

/** Ejecuta varias consultas dentro de una transacción. */
export async function enTransaccion<T>(
  trabajo: (cx: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const resultado = await trabajo(cx);
    await cx.commit();
    return resultado;
  } catch (error) {
    await cx.rollback();
    throw error;
  } finally {
    cx.release();
  }
}