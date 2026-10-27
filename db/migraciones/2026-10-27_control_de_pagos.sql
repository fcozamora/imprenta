-- =====================================================================
--  Control de pagos de la Imprenta y la Radio
--
--  Los pagos que se repiten todos los meses o cada quincena: alquiler,
--  servicios, licencias. Cada uno lleva su descripcion, con que
--  frecuencia se paga y que dia del mes toca. Al marcarlo pagado queda
--  guardado el periodo, la fecha y el numero de comprobante.
--
--  Lo ven y lo manejan Administrador, Gerente y Asistente
--  Administrativo.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Los pagos de cada empresa
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pagos_fijos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  empresa     ENUM('IMPRENTA','RADIO') NOT NULL,
  descripcion VARCHAR(160) NOT NULL,
  frecuencia  ENUM('MENSUAL','QUINCENAL') NOT NULL DEFAULT 'MENSUAL',
  -- Que dia del mes se paga. El segundo dia solo lo usa el quincenal.
  -- Si el mes no llega a ese dia (un 31 en febrero), se corre al ultimo.
  dia_1       TINYINT UNSIGNED NOT NULL,
  dia_2       TINYINT UNSIGNED DEFAULT NULL,
  notas       VARCHAR(255) DEFAULT NULL,
  activo      TINYINT(1) NOT NULL DEFAULT 1,
  -- Desde cuando se controla: no se piden comprobantes de antes de esto.
  desde       DATE NOT NULL,
  creado_por  INT UNSIGNED NOT NULL,
  creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_pago_empresa (empresa, activo, descripcion),
  KEY fk_pago_fijo_usuario (creado_por),
  CONSTRAINT fk_pago_fijo_usuario FOREIGN KEY (creado_por) REFERENCES usuarios (id),
  CONSTRAINT chk_pago_dia_1 CHECK (dia_1 BETWEEN 1 AND 31),
  CONSTRAINT chk_pago_dia_2 CHECK (dia_2 IS NULL OR dia_2 BETWEEN 1 AND 31)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Pagos que se repiten: alquiler, servicios, licencias';

-- ---------------------------------------------------------------------
-- 2. Cada vez que se paga
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pagos_fijos_registros (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pago_fijo_id   INT UNSIGNED NOT NULL,
  -- El vencimiento que se esta cubriendo, para no pagar dos veces lo mismo.
  periodo        DATE NOT NULL,
  pagado_en      DATE NOT NULL,
  comprobante    VARCHAR(60) NOT NULL,
  nota           VARCHAR(255) DEFAULT NULL,
  registrado_por INT UNSIGNED NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_pago_periodo (pago_fijo_id, periodo),
  KEY fk_pago_registro_usuario (registrado_por),
  CONSTRAINT fk_pago_registro_pago FOREIGN KEY (pago_fijo_id)
    REFERENCES pagos_fijos (id) ON DELETE CASCADE,
  CONSTRAINT fk_pago_registro_usuario FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Comprobantes de los pagos fijos, uno por periodo';

-- ---------------------------------------------------------------------
-- 3. Permiso
-- ---------------------------------------------------------------------

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT 'pagos_fijos.gestionar', 'ADMINISTRACION',
       'Ver y manejar el control de pagos de la Imprenta y la Radio'
 WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = 'pagos_fijos.gestionar');

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'pagos_fijos.gestionar'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'pagos_fijos.gestionar'
   );

-- ---------------------------------------------------------------------
-- Comprobacion
-- ---------------------------------------------------------------------
SELECT 'Tablas del control de pagos' AS revision;
SELECT TABLE_NAME AS tabla
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('pagos_fijos', 'pagos_fijos_registros')
 ORDER BY TABLE_NAME;

SELECT 'Quienes manejan el control de pagos' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'pagos_fijos.gestionar'
 ORDER BY p.id;
