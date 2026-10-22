-- =====================================================================
--  Los diseñadores editan la orden de trabajo
--
--  Cuando el cliente cambia la cantidad, una observacion o cualquier
--  otro detalle, el diseñador que tiene la orden en la mano es quien se
--  entera. Hasta ahora tenia que pedirle a recepcion que la corrigiera.
--
--  Lo que haga queda registrado: la edicion guarda en la bitacora que
--  fue lo que cambio y quien lo hizo, y eso se ve en el detalle de la
--  orden.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'ordenes.editar'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo',
                    'Recepcionista', 'Vendedor(a)', 'Diseñador')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'ordenes.editar'
   );

-- Comprobacion
SELECT 'Quienes editan ordenes' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.editar'
 ORDER BY p.id;
