import path from 'node:path';
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
import { rutasExtras } from './rutas/extras.rutas.js';
import { rutasPedidosExternos } from './rutas/pedidosExternos.rutas.js';
import { rutasVacaciones } from './rutas/vacaciones.rutas.js';

const app = express();

// upgrade-insecure-requests obliga al navegador a pedir todo por https, y el
// servidor de la imprenta va por http en la red local: sin quitarla, la pagina
// queda en blanco desde cualquier equipo que no sea el propio servidor.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'upgrade-insecure-requests': null,
      'img-src': ["'self'", 'data:', 'blob:'],
    },
  },
}));
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
app.use('/api', rutasExtras);
app.use('/api/pedidos-externos', rutasPedidosExternos);
app.use('/api', rutasVacaciones);

// En produccion el backend tambien sirve las pantallas compiladas.
const carpetaWeb = path.resolve(process.cwd(), 'public');
app.use(express.static(carpetaWeb));

// Cualquier direccion que no sea de la API devuelve la aplicacion,
// para que funcionen los enlaces internos al recargar la pagina.
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(carpetaWeb, 'index.html'));
});

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