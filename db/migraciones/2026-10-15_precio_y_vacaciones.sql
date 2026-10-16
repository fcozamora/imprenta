-- =====================================================================
--  1. Precio por linea de trabajo
--  2. Modulo de vacaciones
--  Los permisos, tablas y rutinas se pueden volver a ejecutar sin duplicar
--  nada. El ALTER TABLE del precio no: si se corre dos veces avisa
--  "Duplicate column name 'precio'" y se puede ignorar.
-- =====================================================================

-- Sin esto, un cliente configurado en latin1 guarda las tildes al reves
-- y los mensajes de las notificaciones quedan con simbolos raros.
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. PRECIO
-- ---------------------------------------------------------------------

ALTER TABLE orden_lineas
  ADD COLUMN precio DECIMAL(10,2) NULL COMMENT 'Referencia interna, no es facturacion'
  AFTER cantidad;

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT 'ordenes.ver_precio', 'ORDENES', 'Ver y anotar el precio de los trabajos'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = 'ordenes.ver_precio');

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'ordenes.ver_precio'
FROM puestos p
WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo',
                   'Recepcionista', 'Vendedor(a)', 'Diseñador')
  AND NOT EXISTS (
    SELECT 1 FROM puesto_permisos pp
     WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'ordenes.ver_precio'
  );

-- ---------------------------------------------------------------------
-- 2. VACACIONES
-- ---------------------------------------------------------------------

-- Dias asignados a cada persona. Lo tomado NO se guarda aqui: se suma de
-- las solicitudes aprobadas, para que el saldo nunca pueda quedar torcido.
CREATE TABLE IF NOT EXISTS vacaciones_saldos (
  usuario_id     INT UNSIGNED  NOT NULL,
  dias_totales   DECIMAL(5,1)  NOT NULL DEFAULT 0,
  nota           VARCHAR(200)  NULL,
  actualizado_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por INT UNSIGNED NULL,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_vacsaldo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacsaldo_por     FOREIGN KEY (actualizado_por) REFERENCES usuarios(id),
  CONSTRAINT ck_vacsaldo_positivo CHECK (dias_totales >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vacaciones_solicitudes (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED    NOT NULL,
  fecha_inicio   DATE            NOT NULL,
  fecha_fin      DATE            NOT NULL,
  medio_dia      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Media jornada de un solo dia',
  dias           DECIMAL(5,1)    NOT NULL DEFAULT 0 COMMENT 'Lo calcula el disparador',
  motivo         VARCHAR(255)    NULL,
  estado         ENUM('PENDIENTE','APROBADA','RECHAZADA','CANCELADA')
                 NOT NULL DEFAULT 'PENDIENTE',
  modificada     TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Administracion cambio las fechas',
  inicio_pedido  DATE            NULL COMMENT 'Lo que pidio la persona, si se modifico',
  fin_pedido     DATE            NULL,
  resuelta_por   INT UNSIGNED    NULL,
  resuelta_en    DATETIME        NULL,
  nota_resolucion VARCHAR(255)   NULL,
  creado_en      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_vacsol_usuario (usuario_id, estado),
  KEY ix_vacsol_pendientes (estado, fecha_inicio),
  CONSTRAINT fk_vacsol_usuario  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacsol_resuelta FOREIGN KEY (resuelta_por) REFERENCES usuarios(id),
  CONSTRAINT ck_vacsol_rango CHECK (fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Las notificaciones de vacaciones necesitan sus propios tipos.
ALTER TABLE notificaciones
  MODIFY COLUMN tipo ENUM('ORDEN_CREADA','ORDEN_FINALIZADA','ORDEN_ESTANCADA',
                          'ORDEN_POR_VENCER','SOLICITUD_MATERIAL','PEDIDO_CAMISETAS',
                          'SELLO_BAJO_MINIMO','SISTEMA',
                          'VACACIONES_SOLICITUD','VACACIONES_RESUELTA') NOT NULL;

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT * FROM (
  SELECT 'vacaciones.solicitar' AS c, 'VACACIONES' AS m, 'Pedir vacaciones y ver el estado de lo pedido' AS d
  UNION ALL
  SELECT 'vacaciones.gestionar', 'VACACIONES', 'Aprobar solicitudes y administrar los dias de cada persona'
) nuevos
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = nuevos.c);

-- Pedir vacaciones lo puede hacer todo el personal.
INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'vacaciones.solicitar'
FROM puestos p
WHERE NOT EXISTS (
  SELECT 1 FROM puesto_permisos pp
   WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'vacaciones.solicitar'
);

-- Aprobar y ver saldos, solo administracion.
INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'vacaciones.gestionar'
FROM puestos p
WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo')
  AND NOT EXISTS (
    SELECT 1 FROM puesto_permisos pp
     WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'vacaciones.gestionar'
  );

-- ---------------------------------------------------------------------
-- Rutinas
-- ---------------------------------------------------------------------
DELIMITER $$

-- Cuenta los dias habiles de un rango, ambos extremos incluidos.
-- Reusa fn_es_habil, que ya salta fines de semana y la tabla de feriados.
DROP FUNCTION IF EXISTS fn_dias_habiles_entre $$
CREATE FUNCTION fn_dias_habiles_entre(p_desde DATE, p_hasta DATE)
RETURNS DECIMAL(5,1)
DETERMINISTIC READS SQL DATA
BEGIN
  DECLARE v_dia DATE;
  DECLARE v_n DECIMAL(5,1) DEFAULT 0;
  SET v_dia = p_desde;
  WHILE v_dia <= p_hasta DO
    IF fn_es_habil(v_dia) THEN SET v_n = v_n + 1; END IF;
    SET v_dia = DATE_ADD(v_dia, INTERVAL 1 DAY);
  END WHILE;
  RETURN v_n;
END $$

-- Al crear la solicitud se calculan los dias y se avisa a administracion.
DROP TRIGGER IF EXISTS bi_vacaciones_solicitudes $$
CREATE TRIGGER bi_vacaciones_solicitudes
BEFORE INSERT ON vacaciones_solicitudes FOR EACH ROW
BEGIN
  IF NEW.medio_dia = 1 THEN
    SET NEW.fecha_fin = NEW.fecha_inicio;
    SET NEW.dias = 0.5;
    IF fn_es_habil(NEW.fecha_inicio) = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese dia no es habil';
    END IF;
  ELSE
    SET NEW.dias = fn_dias_habiles_entre(NEW.fecha_inicio, NEW.fecha_fin);
    IF NEW.dias = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango no tiene dias habiles';
    END IF;
  END IF;
  SET NEW.inicio_pedido = NEW.fecha_inicio;
  SET NEW.fin_pedido    = NEW.fecha_fin;
END $$

DROP TRIGGER IF EXISTS ai_vacaciones_solicitudes $$
CREATE TRIGGER ai_vacaciones_solicitudes
AFTER INSERT ON vacaciones_solicitudes FOR EACH ROW
BEGIN
  DECLARE v_nid BIGINT UNSIGNED;
  DECLARE v_quien VARCHAR(145);

  SELECT nombre_completo INTO v_quien FROM usuarios WHERE id = NEW.usuario_id;

  INSERT INTO notificaciones (tipo, titulo, mensaje, url_destino, generada_por)
  VALUES ('VACACIONES_SOLICITUD',
          'Solicitud de vacaciones',
          CONCAT(v_quien, ' pidió ', FORMAT(NEW.dias, 1), ' día(s) del ',
                 DATE_FORMAT(NEW.fecha_inicio, '%d/%m/%Y'), ' al ',
                 DATE_FORMAT(NEW.fecha_fin, '%d/%m/%Y'), '.'),
          '/vacaciones', NEW.usuario_id);
  SET v_nid = LAST_INSERT_ID();

  INSERT INTO notificacion_destinatarios (notificacion_id, usuario_id)
  SELECT v_nid, u.id
    FROM usuarios u
    JOIN puesto_permisos pp ON pp.puesto_id = u.puesto_id
   WHERE u.activo = 1
     AND pp.permiso_codigo = 'vacaciones.gestionar'
     AND u.id <> NEW.usuario_id;
END $$

-- Si administracion cambia las fechas, los dias se recalculan solos.
DROP TRIGGER IF EXISTS bu_vacaciones_solicitudes $$
CREATE TRIGGER bu_vacaciones_solicitudes
BEFORE UPDATE ON vacaciones_solicitudes FOR EACH ROW
BEGIN
  IF NEW.fecha_inicio <> OLD.fecha_inicio
     OR NEW.fecha_fin <> OLD.fecha_fin
     OR NEW.medio_dia <> OLD.medio_dia THEN
    IF NEW.medio_dia = 1 THEN
      SET NEW.fecha_fin = NEW.fecha_inicio;
      SET NEW.dias = 0.5;
    ELSE
      SET NEW.dias = fn_dias_habiles_entre(NEW.fecha_inicio, NEW.fecha_fin);
      IF NEW.dias = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango no tiene dias habiles';
      END IF;
    END IF;
    SET NEW.modificada = 1;
  END IF;
END $$

-- Al resolverla, el aviso le llega a quien la pidio.
DROP TRIGGER IF EXISTS au_vacaciones_solicitudes $$
CREATE TRIGGER au_vacaciones_solicitudes
AFTER UPDATE ON vacaciones_solicitudes FOR EACH ROW
BEGIN
  DECLARE v_nid BIGINT UNSIGNED;
  DECLARE v_texto VARCHAR(500);

  IF NEW.estado <> OLD.estado AND NEW.estado IN ('APROBADA','RECHAZADA') THEN
    SET v_texto = CONCAT(
      IF(NEW.estado = 'APROBADA', 'Le aprobaron ', 'Le rechazaron '),
      FORMAT(NEW.dias, 1), ' día(s) del ',
      DATE_FORMAT(NEW.fecha_inicio, '%d/%m/%Y'), ' al ',
      DATE_FORMAT(NEW.fecha_fin, '%d/%m/%Y'), '.',
      IF(NEW.modificada = 1, ' Las fechas fueron ajustadas.', ''),
      IF(NEW.nota_resolucion IS NULL, '', CONCAT(' ', NEW.nota_resolucion)));

    INSERT INTO notificaciones (tipo, titulo, mensaje, url_destino, generada_por)
    VALUES ('VACACIONES_RESUELTA',
            IF(NEW.estado = 'APROBADA', 'Vacaciones aprobadas', 'Vacaciones rechazadas'),
            v_texto, '/vacaciones', NEW.resuelta_por);
    SET v_nid = LAST_INSERT_ID();

    INSERT INTO notificacion_destinatarios (notificacion_id, usuario_id)
    VALUES (v_nid, NEW.usuario_id);
  END IF;
END $$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'precio en orden_lineas' AS que,
       COUNT(*) AS ok
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orden_lineas' AND COLUMN_NAME = 'precio'
UNION ALL
SELECT 'tablas de vacaciones', COUNT(*)
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('vacaciones_saldos','vacaciones_solicitudes')
UNION ALL
SELECT 'permisos nuevos', COUNT(*)
  FROM permisos
 WHERE codigo IN ('ordenes.ver_precio','vacaciones.solicitar','vacaciones.gestionar')
UNION ALL
SELECT 'funcion de dias habiles', COUNT(*)
  FROM information_schema.ROUTINES
 WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'fn_dias_habiles_entre';

SELECT p.nombre AS puesto_que_aprueba
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'vacaciones.gestionar'
 ORDER BY p.id;
