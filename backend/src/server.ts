import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { ErrorHttp } from './util/errores.js';
import { prepararCarpeta } from './servicios/archivos.servicio.js';
import { rutasAuth } from './rutas/auth.rutas.js';
import { rutasAdmin } from './rutas/admin.rutas.js';
import { rutasClientes } from './rutas/clientes.rutas.js';
import { rutasOrdenes } from './rutas/ordenes.rutas.js';
import { rutasOperacion } from './rutas/operacion.rutas.js';
import { rutasReportes } from './rutas/reportes.rutas.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

app.get('/api/salud', async (_req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM tipos_trabajo) AS tipos_trabajo,
         (SELECT COUNT(*) FROM etapas)        AS etapas,
         (SELECT COUNT(*) FROM usuarios)      AS usuarios,
         (SELECT COUNT(*) FROM ordenes)       AS ordenes,
         NOW()                                AS hora_bd`
    );
    res.json({ estado: 'ok', bd: (filas as any[])[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ estado: 'error', mensaje: 'Sin conexión a la base de datos' });
  }
});

app.use('/api/auth', rutasAuth);
app.use('/api/admin', rutasAdmin);
app.use('/api', rutasClientes);
app.use('/api', rutasOrdenes);
app.use('/api', rutasOperacion);
app.use('/api', rutasReportes);

app.use((_req, res) => {
  res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      mensaje: 'Datos inválidos',
      detalles: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (error instanceof ErrorHttp) {
    return res.status(error.estado).json({ mensaje: error.message, codigo: error.codigo });
  }
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ mensaje: 'La imagen supera los 10 MB' });
  }
  console.error(error);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

await prepararCarpeta();

app.listen(env.puerto, () => {
  console.log(`API escuchando en http://localhost:${env.puerto}`);
});