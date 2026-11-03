-- =====================================================================
--  Recepcion tambien anula ordenes
--
--  Anular lo tenian solo Administrador y Gerente. Como quien recibe la
--  llamada del cliente que cancela es recepcion, se les agrega a ellas.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'ordenes.anular'
  FROM puestos p
 WHERE p.nombre = 'Recepcionista'
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'ordenes.anular'
   );

-- Comprobacion
SELECT 'Quienes pueden anular ordenes' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.anular'
 ORDER BY p.id;
