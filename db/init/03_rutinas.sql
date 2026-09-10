-- =====================================================================
--  IMPRENTA · 03_rutinas.sql
--  Funciones, triggers, procedimientos, vistas y eventos
-- =====================================================================
SET NAMES utf8mb4;

DELIMITER $$

-- =====================================================================
--  FUNCIONES DE CALENDARIO
-- =====================================================================

-- ¿La fecha es día hábil? (lunes a viernes y no feriado)
CREATE FUNCTION fn_es_habil(p_fecha DATE) RETURNS TINYINT(1)
READS SQL DATA
BEGIN
  IF DAYOFWEEK(p_fecha) IN (1, 7) THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM feriados WHERE fecha = p_fecha) THEN
    RETURN 0;
  END IF;
  RETURN 1;
END$$

-- Primer día hábil a partir de una fecha (inclusive)
CREATE FUNCTION fn_siguiente_habil(p_fecha DATE) RETURNS DATE
READS SQL DATA
BEGIN
  DECLARE v_fecha DATE DEFAULT p_fecha;
  DECLARE v_guarda SMALLINT DEFAULT 0;
  WHILE fn_es_habil(v_fecha) = 0 AND v_guarda < 60 DO
    SET v_fecha = v_fecha + INTERVAL 1 DAY;
    SET v_guarda = v_guarda + 1;
  END WHILE;
  RETURN v_fecha;
END$$

-- Suma N días hábiles a una fecha
CREATE FUNCTION fn_sumar_dias_habiles(p_desde DATE, p_dias INT) RETURNS DATE
READS SQL DATA
BEGIN
  DECLARE v_fecha DATE DEFAULT p_desde;
  DECLARE v_sumados INT DEFAULT 0;
  DECLARE v_guarda INT DEFAULT 0;
  IF p_dias IS NULL OR p_dias <= 0 THEN
    RETURN fn_siguiente_habil(p_desde);
  END IF;
  WHILE v_sumados < p_dias AND v_guarda < 400 DO
    SET v_fecha = v_fecha + INTERVAL 1 DAY;
    SET v_guarda = v_guarda + 1;
    IF fn_es_habil(v_fecha) = 1 THEN
      SET v_sumados = v_sumados + 1;
    END IF;
  END WHILE;
  RETURN v_fecha;
END$$

-- =====================================================================
--  TRIGGERS · ÓRDENES
-- =====================================================================

-- Número de orden autogenerado y atómico
CREATE TRIGGER bi_ordenes_numero
BEFORE INSERT ON ordenes FOR EACH ROW
BEGIN
  UPDATE secuencias SET valor = LAST_INSERT_ID(valor + 1) WHERE nombre = 'orden';
  SET NEW.numero_orden = LAST_INSERT_ID();

  IF NEW.fecha_ingreso IS NULL THEN
    SET NEW.fecha_ingreso = fn_siguiente_habil(CURDATE() + INTERVAL 1 DAY);
  END IF;
END$$

-- El número de orden es inmutable
CREATE TRIGGER bu_ordenes_numero
BEFORE UPDATE ON ordenes FOR EACH ROW
BEGIN
  IF NEW.numero_orden <> OLD.numero_orden THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El número de orden no puede modificarse';
  END IF;
END$$

-- WhatsApp de confirmación al crear la orden
CREATE TRIGGER ai_ordenes_whatsapp
AFTER INSERT ON ordenes FOR EACH ROW
BEGIN
  DECLARE v_tel VARCHAR(20);
  SELECT COALESCE(telefono_wa, telefono) INTO v_tel FROM clientes WHERE id = NEW.cliente_id;

  IF v_tel IS NOT NULL THEN
    INSERT INTO whatsapp_cola (orden_id, telefono, plantilla, mensaje)
    VALUES (NEW.id, v_tel, 'ORDEN_CREADA',
            CONCAT('Estimado cliente se ha generado la orden de trabajo # ', NEW.numero_orden,
                   ', cualquier consulta comunicarse mediante whatsapp al 24601930.'));
  END IF;
END$$

-- =====================================================================
--  TRIGGERS · LÍNEAS DE ORDEN
-- =====================================================================

-- Calcula fecha de entrega y vincula/crea el "Producto" del cliente
CREATE TRIGGER bi_orden_lineas
BEFORE INSERT ON orden_lineas FOR EACH ROW
BEGIN
  DECLARE v_ingreso   DATE;
  DECLARE v_cliente   INT UNSIGNED;
  DECLARE v_dias      SMALLINT UNSIGNED;
  DECLARE v_siguiente SMALLINT UNSIGNED;

  SELECT fecha_ingreso, cliente_id INTO v_ingreso, v_cliente
    FROM ordenes WHERE id = NEW.orden_id;

  SELECT dias_habiles_entrega INTO v_dias
    FROM tipos_trabajo WHERE id = NEW.tipo_trabajo_id;

  IF NEW.fecha_entrega IS NULL THEN
    SET NEW.fecha_entrega = fn_sumar_dias_habiles(v_ingreso, v_dias);
  END IF;

  -- Consecutivo de línea dentro de la orden
  IF NEW.linea IS NULL OR NEW.linea = 0 THEN
    SELECT COALESCE(MAX(linea), 0) + 1 INTO v_siguiente
      FROM orden_lineas WHERE orden_id = NEW.orden_id;
    SET NEW.linea = v_siguiente;
  END IF;

  -- Producto del cliente (crea o actualiza el historial)
  INSERT INTO productos_cliente
        (cliente_id, tipo_trabajo_id, nombre_trabajo, veces_solicitado,
         primera_fecha, ultima_fecha, ultima_orden_id)
  VALUES (v_cliente, NEW.tipo_trabajo_id, NEW.nombre_trabajo, 1,
          CURDATE(), CURDATE(), NEW.orden_id)
  ON DUPLICATE KEY UPDATE
        id               = LAST_INSERT_ID(id),
        veces_solicitado = veces_solicitado + 1,
        ultima_fecha     = CURDATE(),
        ultima_orden_id  = NEW.orden_id;

  SET NEW.producto_id = LAST_INSERT_ID();
END$$

-- La fecha de entrega de la orden es la mayor de sus líneas
CREATE TRIGGER ai_orden_lineas
AFTER INSERT ON orden_lineas FOR EACH ROW
BEGIN
  UPDATE ordenes
     SET fecha_entrega = GREATEST(COALESCE(fecha_entrega, NEW.fecha_entrega), NEW.fecha_entrega)
   WHERE id = NEW.orden_id;
END$$

-- =====================================================================
--  TRIGGERS · ETAPAS (trazabilidad + notificaciones)
-- =====================================================================

CREATE TRIGGER bi_linea_etapas
BEFORE INSERT ON linea_etapas FOR EACH ROW
BEGIN
  DECLARE v_anterior DATETIME;
  SELECT ultimo_cambio_etapa INTO v_anterior FROM orden_lineas WHERE id = NEW.linea_id;
  IF v_anterior IS NOT NULL THEN
    SET NEW.minutos_en_etapa = TIMESTAMPDIFF(MINUTE, v_anterior, NEW.marcada_en);
  END IF;
END$$

CREATE TRIGGER ai_linea_etapas
AFTER INSERT ON linea_etapas FOR EACH ROW
BEGIN
  DECLARE v_codigo     VARCHAR(30);
  DECLARE v_orden      BIGINT UNSIGNED;
  DECLARE v_num        INT UNSIGNED;
  DECLARE v_vendedor   INT UNSIGNED;
  DECLARE v_tel        VARCHAR(20);
  DECLARE v_cliente    VARCHAR(120);
  DECLARE v_pendientes INT DEFAULT 0;
  DECLARE v_nid        BIGINT UNSIGNED;

  SELECT codigo INTO v_codigo FROM etapas WHERE id = NEW.etapa_id;

  -- Estado desnormalizado de la línea
  UPDATE orden_lineas
     SET etapa_actual_id     = NEW.etapa_id,
         secuencia_actual    = NEW.secuencia,
         ultimo_cambio_etapa = NEW.marcada_en,
         finalizada          = (v_codigo IN ('FINALIZADO','ENTREGADO')),
         entregada           = (v_codigo = 'ENTREGADO')
   WHERE id = NEW.linea_id;

  SELECT o.id, o.numero_orden, o.vendedor_id,
         COALESCE(c.telefono_wa, c.telefono), c.nombre
    INTO v_orden, v_num, v_vendedor, v_tel, v_cliente
    FROM orden_lineas ol
    JOIN ordenes  o ON o.id = ol.orden_id
    JOIN clientes c ON c.id = o.cliente_id
   WHERE ol.id = NEW.linea_id;

  -- ¿Quedan líneas sin finalizar en esta orden?
  SELECT COUNT(*) INTO v_pendientes
    FROM orden_lineas WHERE orden_id = v_orden AND finalizada = 0;

  IF v_codigo = 'FINALIZADO' AND v_pendientes = 0 THEN
    UPDATE ordenes SET estado = 'FINALIZADA', finalizada_en = NOW() WHERE id = v_orden;

    INSERT INTO notificaciones (tipo, titulo, mensaje, orden_id, url_destino, generada_por)
    VALUES ('ORDEN_FINALIZADA',
            CONCAT('Orden #', v_num, ' finalizada'),
            CONCAT('La orden #', v_num, ' de ', v_cliente, ' está lista para entrega.'),
            v_orden, CONCAT('/ordenes/', v_orden), NEW.usuario_id);
    SET v_nid = LAST_INSERT_ID();

    -- Recepcionistas (puesto 4) + el vendedor dueño de la orden
    INSERT INTO notificacion_destinatarios (notificacion_id, usuario_id)
    SELECT v_nid, u.id FROM usuarios u
     WHERE u.activo = 1 AND (u.puesto_id = 4 OR u.id = v_vendedor);

    IF v_tel IS NOT NULL THEN
      INSERT INTO whatsapp_cola (orden_id, telefono, plantilla, mensaje)
      VALUES (v_orden, v_tel, 'ORDEN_LISTA',
              CONCAT('Estimado cliente, le informamos que el pedido con el número de orden *',
                     v_num,
                     '* se encuentra listo para retirar, favor retirar el pedido con el número de orden, gracias por su preferencia',
                     CHAR(10), '*Por favor no contestar este mensaje*'));
    END IF;
  END IF;

  IF v_codigo = 'ENTREGADO' AND v_pendientes = 0 THEN
    UPDATE ordenes SET estado = 'ENTREGADA', entregada_en = NOW() WHERE id = v_orden;
  END IF;
END$$

-- =====================================================================
--  TRIGGERS · SOLICITUDES DE MATERIAL
-- =====================================================================

CREATE TRIGGER ai_solicitudes_material
AFTER INSERT ON solicitudes_material FOR EACH ROW
BEGIN
  DECLARE v_nid    BIGINT UNSIGNED;
  DECLARE v_quien  VARCHAR(145);

  SELECT nombre_completo INTO v_quien FROM usuarios WHERE id = NEW.usuario_id;

  INSERT INTO notificaciones (tipo, titulo, mensaje, url_destino, generada_por)
  VALUES ('SOLICITUD_MATERIAL',
          'Nueva solicitud de material',
          CONCAT(v_quien, ' solicitó materiales.'),
          CONCAT('/materiales/', NEW.id), NEW.usuario_id);
  SET v_nid = LAST_INSERT_ID();

  INSERT INTO notificacion_destinatarios (notificacion_id, usuario_id)
  SELECT v_nid, u.id FROM usuarios u
   WHERE u.activo = 1 AND (u.es_admin = 1 OR u.puesto_id IN (2, 3));
END$$

-- =====================================================================
--  PROCEDIMIENTOS
-- =====================================================================

-- Avanza exactamente UNA etapa, saltando las omitidas por "Archivo sin cambios".
-- Llamar también justo después de crear la línea, para colocarla en "Diseño".
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

  SELECT tipo_trabajo_id, archivo_sin_cambios, secuencia_actual
    INTO v_tipo, v_sin_cambios, v_actual
    FROM orden_lineas WHERE id = p_linea_id FOR UPDATE;

  IF v_tipo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La línea de orden no existe';
  END IF;

  SELECT f.secuencia, f.etapa_id INTO v_sec, v_etapa
    FROM flujo_etapas f
   WHERE f.tipo_trabajo_id = v_tipo
     AND f.secuencia > v_actual
     AND NOT (v_sin_cambios = 1 AND f.omitir_sin_cambios = 1)
   ORDER BY f.secuencia
   LIMIT 1;

  IF v_sec IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La línea ya está en su última etapa';
  END IF;

  INSERT INTO linea_etapas (linea_id, etapa_id, secuencia, usuario_id, nota)
  VALUES (p_linea_id, v_etapa, v_sec, p_usuario_id, p_nota);
END$$

-- Movimiento de inventario de sellos con saldo consistente
CREATE PROCEDURE sp_mover_sello(
  IN p_sello_id   INT UNSIGNED,
  IN p_tipo       VARCHAR(10),
  IN p_cantidad   INT,
  IN p_usuario_id INT UNSIGNED,
  IN p_motivo     VARCHAR(150))
BEGIN
  DECLARE v_saldo INT DEFAULT NULL;
  DECLARE v_nuevo INT;

  SELECT cantidad INTO v_saldo FROM sellos_inventario WHERE id = p_sello_id FOR UPDATE;
  IF v_saldo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El sello no existe';
  END IF;

  SET v_nuevo = CASE p_tipo
                  WHEN 'ENTRADA' THEN v_saldo + ABS(p_cantidad)
                  WHEN 'SALIDA'  THEN v_saldo - ABS(p_cantidad)
                  ELSE p_cantidad
                END;

  IF v_nuevo < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La existencia no puede quedar negativa';
  END IF;

  UPDATE sellos_inventario SET cantidad = v_nuevo WHERE id = p_sello_id;

  INSERT INTO sellos_movimientos
        (sello_id, tipo, cantidad, saldo_anterior, saldo_nuevo, motivo, usuario_id)
  VALUES (p_sello_id, p_tipo, p_cantidad, v_saldo, v_nuevo, p_motivo, p_usuario_id);
END$$

-- Detecta trabajos sin movimiento por más de N días y notifica
CREATE PROCEDURE sp_detectar_estancadas(IN p_dias INT)
BEGIN
  DECLARE v_fin INT DEFAULT 0;
  DECLARE v_linea BIGINT UNSIGNED;
  DECLARE v_orden BIGINT UNSIGNED;
  DECLARE v_num INT UNSIGNED;
  DECLARE v_vend INT UNSIGNED;
  DECLARE v_nid BIGINT UNSIGNED;

  DECLARE cur CURSOR FOR
    SELECT ol.id, o.id, o.numero_orden, o.vendedor_id
      FROM orden_lineas ol
      JOIN ordenes o ON o.id = ol.orden_id
     WHERE ol.finalizada = 0
       AND o.estado = 'ABIERTA'
       AND ol.ultimo_cambio_etapa < NOW() - INTERVAL p_dias DAY
       AND NOT EXISTS (
             SELECT 1 FROM notificaciones n
              WHERE n.linea_id = ol.id
                AND n.tipo = 'ORDEN_ESTANCADA'
                AND n.creada_en > NOW() - INTERVAL p_dias DAY);
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin = 1;

  OPEN cur;
  bucle: LOOP
    FETCH cur INTO v_linea, v_orden, v_num, v_vend;
    IF v_fin = 1 THEN LEAVE bucle; END IF;

    INSERT INTO notificaciones (tipo, titulo, mensaje, orden_id, linea_id, url_destino)
    VALUES ('ORDEN_ESTANCADA',
            CONCAT('Orden #', v_num, ' sin avance'),
            CONCAT('La orden #', v_num, ' lleva más de ', p_dias, ' días sin cambiar de etapa.'),
            v_orden, v_linea, CONCAT('/ordenes/', v_orden));
    SET v_nid = LAST_INSERT_ID();

    INSERT INTO notificacion_destinatarios (notificacion_id, usuario_id)
    SELECT v_nid, u.id FROM usuarios u
     WHERE u.activo = 1 AND (u.puesto_id = 4 OR u.id = v_vend);
  END LOOP;
  CLOSE cur;
END$$

DELIMITER ;

-- =====================================================================
--  VISTAS
-- =====================================================================

-- Dashboard principal: una fila por tipo de trabajo dentro de la orden
CREATE OR REPLACE VIEW v_ordenes_dashboard AS
SELECT
  o.id                    AS orden_id,
  o.numero_orden,
  ol.id                   AS linea_id,
  ol.linea,
  c.id                    AS cliente_id,
  c.cedula                AS cliente_cedula,
  c.nombre                AS cliente,
  c.nombre_comercial,
  c.telefono,
  COALESCE(c.telefono_wa, c.telefono) AS telefono_wa,
  tt.id                   AS tipo_trabajo_id,
  tt.nombre               AS tipo_trabajo,
  ol.nombre_trabajo,
  ol.cantidad,
  ol.archivo_sin_cambios,
  e.nombre                AS etapa,
  e.icono                 AS etapa_icono,
  e.color                 AS etapa_color,
  ol.secuencia_actual,
  ol.disenador_id,
  d.nombre_completo       AS disenador,
  o.vendedor_id,
  v.nombre_completo       AS vendedor,
  o.fecha_ingreso,
  ol.fecha_entrega,
  o.estado,
  ol.finalizada,
  ol.ultimo_cambio_etapa,
  DATEDIFF(ol.fecha_entrega, CURDATE())                                AS dias_restantes,
  (DATEDIFF(ol.fecha_entrega, CURDATE()) <= tt.dias_alerta_previa)     AS por_vencer,
  (ol.ultimo_cambio_etapa < NOW() - INTERVAL 7 DAY)                    AS estancada
FROM orden_lineas ol
JOIN ordenes       o  ON o.id  = ol.orden_id
JOIN clientes      c  ON c.id  = o.cliente_id
JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
JOIN usuarios      v  ON v.id  = o.vendedor_id
LEFT JOIN etapas   e  ON e.id  = ol.etapa_actual_id
LEFT JOIN usuarios d  ON d.id  = ol.disenador_id
WHERE o.estado <> 'ANULADA';

-- Bitácora de trabajo del personal de producción
CREATE OR REPLACE VIEW v_bitacora_trabajadores AS
SELECT
  le.id               AS registro_id,
  u.id                AS usuario_id,
  u.nombre_completo   AS trabajador,
  p.nombre            AS puesto,
  o.id                AS orden_id,
  o.numero_orden,
  c.nombre            AS cliente,
  tt.nombre           AS tipo_trabajo,
  ol.nombre_trabajo,
  ol.cantidad,
  e.nombre            AS etapa,
  le.marcada_en,
  le.minutos_en_etapa,
  DATE(le.marcada_en) AS fecha
FROM linea_etapas  le
JOIN usuarios      u  ON u.id  = le.usuario_id
JOIN puestos       p  ON p.id  = u.puesto_id
JOIN orden_lineas  ol ON ol.id = le.linea_id
JOIN ordenes       o  ON o.id  = ol.orden_id
JOIN clientes      c  ON c.id  = o.cliente_id
JOIN tipos_trabajo tt ON tt.id = ol.tipo_trabajo_id
JOIN etapas        e  ON e.id  = le.etapa_id;

-- Inventario de sellos legible
CREATE OR REPLACE VIEW v_sellos AS
SELECT s.id, s.codigo, s.descripcion, s.cantidad, s.minimo,
       t.nombre AS tinta, t.hex AS tinta_hex,
       (s.cantidad <= s.minimo) AS bajo_minimo, s.actualizado_en
FROM sellos_inventario s
JOIN tintas t ON t.id = s.tinta_id
WHERE s.activo = 1;

-- =====================================================================
--  EVENTO PROGRAMADO
-- =====================================================================
CREATE EVENT IF NOT EXISTS ev_ordenes_estancadas
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 7 HOUR)
DO CALL sp_detectar_estancadas(7);
