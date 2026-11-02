-- =====================================================================
--  Talonarios sueltos
--
--  A veces el trabajo no va en block: tarjetas grandes, por ejemplo, que
--  se entregan sueltas. Son siempre sencillos (una sola copia) y en vez
--  de "2 blocks de 100" se anotan como "200 tarjetas".
--
--  Se guardan en la misma tabla con la marca `suelto`: la cantidad del
--  articulo va en cantidad_blocks y hojas_por_block queda en 1, asi el
--  total y la numeracion siguen saliendo solos. La pantalla y la hoja
--  impresa lo muestran como cantidad, no como blocks.
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

SET @ya = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'detalle_talonario'
     AND COLUMN_NAME = 'suelto'
);

SET @sql = IF(
  @ya = 0,
  "ALTER TABLE detalle_talonario
     ADD COLUMN suelto TINYINT(1) NOT NULL DEFAULT 0
       COMMENT 'El trabajo no va en block: la cantidad es de articulos sueltos'
       AFTER hojas_por_block",
  "SELECT 'La columna suelto ya existia' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Columna suelto' AS revision;
SELECT COLUMN_TYPE AS tipo, COLUMN_DEFAULT AS por_omision
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'detalle_talonario'
   AND COLUMN_NAME = 'suelto';

SELECT 'Talonarios en block y sueltos' AS revision;
SELECT IF(suelto = 1, 'Sueltos', 'En block') AS clase, COUNT(*) AS trabajos
  FROM detalle_talonario
 GROUP BY suelto;

SELECT 'Quienes pueden anular ordenes' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.anular'
 ORDER BY p.id;
