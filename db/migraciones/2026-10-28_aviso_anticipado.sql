-- =====================================================================
--  Aviso anticipado en el control de pagos
--
--  Antes un pago se ponia en amarillo el mismo dia del vencimiento. Ahora
--  se enciende varios dias antes -5 por omision- para que de tiempo de
--  tramitarlo. Cada pago puede llevar su propia anticipacion.
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

SET @ya = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pagos_fijos'
     AND COLUMN_NAME = 'avisar_dias'
);

SET @sql = IF(
  @ya = 0,
  "ALTER TABLE pagos_fijos
     ADD COLUMN avisar_dias TINYINT UNSIGNED NOT NULL DEFAULT 5
       COMMENT 'Con cuantos dias de anticipacion se enciende el aviso'
       AFTER dia_2",
  "SELECT 'La columna avisar_dias ya existia' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Columna avisar_dias' AS revision;
SELECT COLUMN_TYPE AS tipo, COLUMN_DEFAULT AS por_omision
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'pagos_fijos'
   AND COLUMN_NAME = 'avisar_dias';

SELECT 'Anticipacion de cada pago' AS revision;
SELECT empresa, descripcion, avisar_dias
  FROM pagos_fijos
 WHERE activo = 1
 ORDER BY empresa, descripcion;
