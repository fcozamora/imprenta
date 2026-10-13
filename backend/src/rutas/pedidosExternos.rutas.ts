import { Router } from 'express';
import { autenticar, requierePermiso } from '../middleware/autenticar.js';
import {
  esquemaPedidoExterno,
  listarPedidosExternos,
  crearPedidoExterno,
  actualizarPedidoExterno,
  marcarRetirado,
  eliminarPedidoExterno,
} from '../servicios/pedidosExternos.servicio.js';

export const rutasPedidosExternos = Router();

rutasPedidosExternos.use(autenticar, requierePermiso('pedidos_externos.gestionar'));

rutasPedidosExternos.get('/', async (req, res, next) => {
  try {
    const lista = await listarPedidosExternos({
      retirados: req.query.retirados === 'true',
      busqueda: typeof req.query.q === 'string' ? req.query.q : '',
    });
    res.json(lista);
  } catch (e) { next(e); }
});

rutasPedidosExternos.post('/', async (req, res, next) => {
  try {
    const datos = esquemaPedidoExterno.parse(req.body);
    const creado = await crearPedidoExterno(datos, req.usuario!.id);
    res.status(201).json(creado);
  } catch (e) { next(e); }
});

rutasPedidosExternos.put('/:id', async (req, res, next) => {
  try {
    const datos = esquemaPedidoExterno.parse(req.body);
    const actualizado = await actualizarPedidoExterno(Number(req.params.id), datos);
    res.json(actualizado);
  } catch (e) { next(e); }
});

rutasPedidosExternos.patch('/:id/retirado', async (req, res, next) => {
  try {
    const actualizado = await marcarRetirado(
      Number(req.params.id),
      req.body?.retirado !== false,
      req.usuario!.id,
    );
    res.json(actualizado);
  } catch (e) { next(e); }
});

rutasPedidosExternos.delete('/:id', async (req, res, next) => {
  try {
    await eliminarPedidoExterno(Number(req.params.id));
    res.status(204).end();
  } catch (e) { next(e); }
});