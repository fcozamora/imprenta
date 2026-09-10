import path from 'node:path';
import dotenv from 'dotenv';

// El .env vive en la raíz del proyecto, un nivel arriba de backend/
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

function requerido(clave: string): string {
  const valor = process.env[clave];
  if (!valor) throw new Error(`Falta la variable ${clave} en el archivo .env`);
  return valor;
}

export const env = {
  puerto: Number(process.env.PORT ?? 3000),
  db: {
    host: requerido('DB_HOST'),
    port: Number(requerido('DB_PORT')),
    database: requerido('DB_NAME'),
    user: requerido('DB_USER'),
    password: requerido('DB_PASSWORD'),
  },
  jwtSecret: requerido('JWT_SECRET'),
  jwtExpira: process.env.JWT_EXPIRA ?? '8h',
  passwordReset: process.env.PASSWORD_RESET ?? 'impreSC01',
};