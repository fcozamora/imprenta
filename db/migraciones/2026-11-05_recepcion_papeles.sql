-- =====================================================================
--  Recepcion tambien agrega papeles
--
--  Los papeles de talonarios se administran desde Materiales de
--  impresion, pero agregarlos pedia el permiso papeles.gestionar, que
--  recepcion no tenia. Se les da.
--
--  Con esto tambien les aparece la pantalla de Papeles, donde se ven las
--  existencias. Mover existencias sigue siendo aparte
--  (papeles.movimientos), y eso no se les da aqui.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'papeles.gestionar'
  FROM puestos p
 WHERE p.nombre = 'Recepcionista'
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'papeles.gestionar'
   );

-- Comprobacion
SELECT 'Quienes administran los papeles' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'papeles.gestionar'
 ORDER BY p.id;

SELECT 'Quienes mueven existencias de papel' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'papeles.movimientos'
 ORDER BY p.id;
