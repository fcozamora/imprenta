-- =====================================================================
--  Abonos y estado de pago de la orden
--
--  El total de la orden es la suma de los precios de sus trabajos. Los
--  abonos se le van aplicando y el estado sale solo:
--
--     sin abonos .................. Pendiente
--     abonado menor que el total .. Abonado
--     abonado alcanza el total .... Cancelada
--
--  Por eso no hay una casilla de "cancelada" que marcar: marcarla es
--  anotar un abono por el total. Y si manana se corrige el precio hacia
--  arriba, la orden vuelve sola a Abonado con su saldo, sin que nadie
--  tenga que acordarse de destildar nada.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS orden_abonos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id       BIGINT UNSIGNED NOT NULL,
  monto          DECIMAL(10,2) NOT NULL,
  nota           VARCHAR(255) DEFAULT NULL,
  registrado_por INT UNSIGNED NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_abono_orden (orden_id, creado_en),
  KEY fk_abono_usuario (registrado_por),
  CONSTRAINT fk_abono_orden FOREIGN KEY (orden_id) REFERENCES ordenes (id) ON DELETE CASCADE,
  CONSTRAINT fk_abono_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id),
  CONSTRAINT chk_abono_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pagos parciales o totales de una orden';

-- ------------------------------------------------------------------
--  Permiso

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT 'pagos.registrar', 'ORDENES', 'Anotar abonos y marcar ordenes como canceladas'
 WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = 'pagos.registrar');

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'pagos.registrar'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo', 'Recepcionista')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'pagos.registrar'
   );

-- ------------------------------------------------------------------
--  Comprobacion

SELECT 'Quienes anotan pagos' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'pagos.registrar'
 ORDER BY p.id;

SELECT 'Tabla de abonos' AS revision;
SELECT COUNT(*) AS abonos_registrados FROM orden_abonos;
