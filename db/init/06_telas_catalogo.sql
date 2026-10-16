-- =====================================================================
--  Telas administrables desde Materiales de impresion
--
--  Las telas ya existian en su tabla, pero solo se podian cambiar por
--  SQL. Ahora son una pestaña mas de la pantalla, al lado de Impresion
--  Digital y HP Latex, y las administran los mismos que ese catalogo.
--
--  Se agrega Recepcionista a materiales.catalogo. Administrador, Gerente
--  y Diseñador ya lo tenian.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'materiales.catalogo'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Diseñador', 'Recepcionista')
   AND EXISTS (SELECT 1 FROM permisos WHERE codigo = 'materiales.catalogo')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'materiales.catalogo'
   );

-- Comprobacion
SELECT 'Quienes administran materiales y telas' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'materiales.catalogo'
 ORDER BY p.id;

SELECT 'Telas registradas' AS revision;
SELECT id, nombre, activo FROM telas ORDER BY nombre;
