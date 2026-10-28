-- =====================================================================
--  Persona de contacto de la orden
--
--  Dos cosas:
--   1. El nombre de la persona con quien se trata esa orden, que no
--      siempre es el cliente registrado.
--   2. Una opcion mas para enviar la muestra: "Otro", con el telefono o
--      el correo de esa persona escrito a mano.
--
--  Las ordenes que ya existen quedan sin contacto (NULL) y con su medio
--  de muestra tal como estaba.
--
--  Se puede ejecutar mas de una vez sin problema.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Nombre del contacto y a donde se le escribe
-- ---------------------------------------------------------------------

SET @ya = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'ordenes'
     AND COLUMN_NAME = 'contacto_nombre'
);

SET @sql = IF(
  @ya = 0,
  "ALTER TABLE ordenes
     ADD COLUMN contacto_nombre VARCHAR(120) NULL
       COMMENT 'Persona de contacto para esta orden'
       AFTER vendedor_id,
     ADD COLUMN contacto_dato VARCHAR(160) NULL
       COMMENT 'Telefono o correo escrito a mano cuando el medio es OTRO'
       AFTER contacto_nombre",
  "SELECT 'Las columnas del contacto ya existian' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- 2. "Otro" como medio para enviar la muestra
-- ---------------------------------------------------------------------

SET @tiene_otro = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'ordenes'
     AND COLUMN_NAME = 'medio_muestra'
     AND COLUMN_TYPE LIKE '%OTRO%'
);

SET @sql = IF(
  @tiene_otro = 0,
  "ALTER TABLE ordenes
     MODIFY COLUMN medio_muestra ENUM('WHATSAPP','EMAIL','VENDEDOR','OTRO') NULL
       COMMENT 'Por donde se le manda la muestra al cliente'",
  "SELECT 'El medio OTRO ya estaba' AS aviso"
);

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Columnas nuevas de ordenes' AS revision;
SELECT COLUMN_NAME AS columna, COLUMN_TYPE AS tipo
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'ordenes'
   AND COLUMN_NAME IN ('contacto_nombre', 'contacto_dato', 'medio_muestra')
 ORDER BY ORDINAL_POSITION;

SELECT 'Ordenes por medio de muestra' AS revision;
SELECT COALESCE(medio_muestra, 'Sin indicar') AS medio, COUNT(*) AS ordenes
  FROM ordenes
 GROUP BY medio_muestra
 ORDER BY ordenes DESC;
