-- =====================================================================
--  Con qué pagó el cliente
--
--  Cada abono queda con su metodo: efectivo, sinpe, transferencia,
--  tarjeta o cheque. Los abonos que ya estaban anotados se quedan sin
--  metodo (NULL), porque no hay forma de adivinarlo; en pantalla salen
--  como "Sin anotar".
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

SET @ya = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'orden_abonos'
     AND COLUMN_NAME = 'metodo_pago'
);

SET @sql = IF(
  @ya = 0,
  "ALTER TABLE orden_abonos
     ADD COLUMN metodo_pago ENUM('EFECTIVO','SINPE','TRANSFERENCIA','TARJETA','CHEQUE')
       NULL COMMENT 'Con que pago el cliente. NULL en los abonos viejos'
       AFTER monto",
  "SELECT 'La columna metodo_pago ya existia' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Columna metodo_pago' AS revision;
SELECT COLUMN_TYPE AS tipo, IS_NULLABLE AS acepta_nulo
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'orden_abonos'
   AND COLUMN_NAME = 'metodo_pago';

SELECT 'Abonos por metodo' AS revision;
SELECT COALESCE(metodo_pago, 'Sin anotar') AS metodo, COUNT(*) AS abonos
  FROM orden_abonos
 GROUP BY metodo_pago
 ORDER BY abonos DESC;
