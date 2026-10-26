-- =====================================================================
--  Los precios no son para diseño
--
--  ordenes.ver_precio lo tenian Administrador, Gerente, Asistente
--  Administrativo, Recepcionista, Vendedor(a) y Diseñador. Se le quita
--  al Diseñador: ve la orden entera menos el precio, el total y el
--  estado de pago, en pantalla y en la hoja impresa.
--
--  Produccion (Numerador, Prencista, Encuadernador) nunca lo tuvo.
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

DELETE pp
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.ver_precio'
   AND p.nombre = 'Diseñador';

-- Comprobacion
SELECT 'Quienes ven precios' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.ver_precio'
 ORDER BY p.id;

SELECT 'Quienes anotan pagos' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'pagos.registrar'
 ORDER BY p.id;
