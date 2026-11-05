-- =====================================================================
--  La etapa de numeracion no sale en los talonarios sin numerar
--
--  El tablero arma la barra de etapas con lo que trae esta vista, asi
--  que necesita saber si el talonario lleva numeracion o no. Se agrega
--  `sin_numerar` al final: 1 cuando es un talonario cuya numeracion
--  quedo en blanco.
--
--  La vista se vuelve a crear igual que estaba, con esa columna de mas
--  y el join nuevo. Se puede ejecutar mas de una vez.
-- =====================================================================

SET NAMES utf8mb4;

CREATE OR REPLACE VIEW v_ordenes_dashboard AS
SELECT o.id                                           AS orden_id,
       o.numero_orden                                 AS numero_orden,
       ol.id                                          AS linea_id,
       ol.linea                                       AS linea,
       c.id                                           AS cliente_id,
       c.cedula                                       AS cliente_cedula,
       c.nombre                                       AS cliente,
       c.nombre_comercial                             AS nombre_comercial,
       c.telefono                                     AS telefono,
       COALESCE(c.telefono_wa, c.telefono)            AS telefono_wa,
       tt.id                                          AS tipo_trabajo_id,
       tt.codigo                                      AS tipo_codigo,
       tt.nombre                                      AS tipo_trabajo,
       ol.nombre_trabajo                              AS nombre_trabajo,
       ol.cantidad                                    AS cantidad,
       ol.archivo_sin_cambios                         AS archivo_sin_cambios,
       e.nombre                                       AS etapa,
       e.codigo                                       AS etapa_codigo,
       e.icono                                        AS etapa_icono,
       e.color                                        AS etapa_color,
       ol.secuencia_actual                            AS secuencia_actual,
       ol.disenador_id                                AS disenador_id,
       d.nombre_completo                              AS disenador,
       dt.costurera_id                                AS costurera_id,
       cos.nombre                                     AS costurera,
       cos.telefono                                   AS costurera_telefono,
       dt.sin_confeccion                              AS sin_confeccion,
       dt.perfil_impresion                            AS perfil_impresion,
       o.vendedor_id                                  AS vendedor_id,
       v.nombre_completo                              AS vendedor,
       o.fecha_ingreso                                AS fecha_ingreso,
       ol.fecha_entrega                               AS fecha_entrega,
       o.estado                                       AS estado,
       o.urgente                                      AS urgente,
       o.motivo_urgencia                              AS motivo_urgencia,
       ol.finalizada                                  AS finalizada,
       ol.ultimo_cambio_etapa                         AS ultimo_cambio_etapa,
       (TO_DAYS(ol.fecha_entrega) - TO_DAYS(CURDATE())) AS dias_restantes,
       ((TO_DAYS(ol.fecha_entrega) - TO_DAYS(CURDATE())) <= tt.dias_alerta_previa) AS por_vencer,
       (ol.ultimo_cambio_etapa < (NOW() - INTERVAL 7 DAY)) AS estancada,
       -- Talonario al que no se le anoto numeracion: su etapa de
       -- numeracion no se muestra ni se marca.
       (dtal.linea_id IS NOT NULL AND dtal.numeracion_inicial IS NULL) AS sin_numerar
  FROM orden_lineas ol
  JOIN ordenes o        ON o.id  = ol.orden_id
  JOIN clientes c       ON c.id  = o.cliente_id
  JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
  JOIN usuarios v       ON v.id  = o.vendedor_id
  LEFT JOIN etapas e            ON e.id  = ol.etapa_actual_id
  LEFT JOIN usuarios d          ON d.id  = ol.disenador_id
  LEFT JOIN detalle_textil dt   ON dt.linea_id   = ol.id
  LEFT JOIN costureras cos      ON cos.id = dt.costurera_id
  LEFT JOIN detalle_talonario dtal ON dtal.linea_id = ol.id
 WHERE o.estado <> 'ANULADA';

-- ---------------------------------------------------------------------
--  Avanzar de etapa tampoco debe pasar por Numeracion
--
--  El procedimiento que marca la etapa siguiente se vuelve a crear igual
--  que estaba, con una condicion mas.
-- ---------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_avanzar_etapa;

DELIMITER ;;
CREATE PROCEDURE sp_avanzar_etapa(
  IN p_linea_id   BIGINT UNSIGNED,
  IN p_usuario_id INT UNSIGNED,
  IN p_nota       VARCHAR(255))
BEGIN
  DECLARE v_tipo        TINYINT UNSIGNED DEFAULT NULL;
  DECLARE v_sin_cambios TINYINT(1)       DEFAULT 0;
  DECLARE v_actual      TINYINT UNSIGNED DEFAULT 0;
  DECLARE v_sec         TINYINT UNSIGNED DEFAULT NULL;
  DECLARE v_etapa       TINYINT UNSIGNED DEFAULT NULL;
  DECLARE v_sin_numerar TINYINT(1)       DEFAULT 0;

  SELECT tipo_trabajo_id, archivo_sin_cambios, secuencia_actual
    INTO v_tipo, v_sin_cambios, v_actual
    FROM orden_lineas WHERE id = p_linea_id FOR UPDATE;

  IF v_tipo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La línea de orden no existe';
  END IF;

  -- Talonario al que no se le anoto numeracion.
  SELECT (dt.linea_id IS NOT NULL AND dt.numeracion_inicial IS NULL)
    INTO v_sin_numerar
    FROM orden_lineas ol
    LEFT JOIN detalle_talonario dt ON dt.linea_id = ol.id
   WHERE ol.id = p_linea_id;

  SELECT f.secuencia, f.etapa_id INTO v_sec, v_etapa
    FROM flujo_etapas f
    JOIN etapas e ON e.id = f.etapa_id
   WHERE f.tipo_trabajo_id = v_tipo
     AND f.secuencia > v_actual
     AND NOT (v_sin_cambios = 1 AND f.omitir_sin_cambios = 1)
     AND NOT (v_sin_numerar = 1 AND e.codigo = 'NUMERACION')
   ORDER BY f.secuencia
   LIMIT 1;

  IF v_sec IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La línea ya está en su última etapa';
  END IF;

  INSERT INTO linea_etapas (linea_id, etapa_id, secuencia, usuario_id, nota)
  VALUES (p_linea_id, v_etapa, v_sec, p_usuario_id, p_nota);
END ;;
DELIMITER ;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'La vista trae la columna nueva' AS revision;
SELECT COUNT(*) AS tiene_sin_numerar
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'v_ordenes_dashboard'
   AND COLUMN_NAME = 'sin_numerar';

SELECT 'Talonarios sin numerar en el tablero' AS revision;
SELECT numero_orden, nombre_trabajo, sin_numerar
  FROM v_ordenes_dashboard
 WHERE tipo_codigo = 'TALONARIOS'
 ORDER BY numero_orden DESC
 LIMIT 10;
