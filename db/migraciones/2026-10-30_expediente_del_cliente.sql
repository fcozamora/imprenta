-- =====================================================================
--  Numero de expediente del cliente
--
--  Un numero propio de la imprenta para llevar el expediente de cada
--  cliente. Se anota en la ficha del cliente y sale en la hoja impresa
--  de la orden, al lado del numero de orden.
--
--  Los clientes que ya existen quedan sin expediente (NULL).
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

SET @ya = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'clientes'
     AND COLUMN_NAME = 'expediente'
);

SET @sql = IF(
  @ya = 0,
  "ALTER TABLE clientes
     ADD COLUMN expediente VARCHAR(40) NULL
       COMMENT 'Numero de expediente que lleva la imprenta'
       AFTER nombre_comercial,
     ADD KEY ix_cliente_expediente (expediente)",
  "SELECT 'La columna expediente ya existia' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Columna expediente' AS revision;
SELECT COLUMN_TYPE AS tipo, IS_NULLABLE AS acepta_nulo
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'clientes'
   AND COLUMN_NAME = 'expediente';

SELECT 'Clientes con expediente anotado' AS revision;
SELECT COUNT(*) AS con_expediente
  FROM clientes
 WHERE expediente IS NOT NULL AND expediente <> '';
