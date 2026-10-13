-- =====================================================================
--  IMPRENTA · Sistema de Órdenes de Trabajo
--  01_schema.sql — Tablas, relaciones e índices
-- =====================================================================
SET NAMES utf8mb4;
SET time_zone = '-06:00';

-- =====================================================================
--  BLOQUE 1 · SEGURIDAD, USUARIOS Y PERMISOS
-- =====================================================================

CREATE TABLE puestos (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(30)  NOT NULL,
  nombre      VARCHAR(60)  NOT NULL,
  descripcion VARCHAR(150) NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_puestos_codigo (codigo),
  UNIQUE KEY uq_puestos_nombre (nombre)
) ENGINE=InnoDB COMMENT='Puestos creados por el administrador';

CREATE TABLE permisos (
  codigo      VARCHAR(50)  NOT NULL,
  modulo      VARCHAR(30)  NOT NULL,
  descripcion VARCHAR(150) NOT NULL,
  PRIMARY KEY (codigo),
  KEY ix_permisos_modulo (modulo)
) ENGINE=InnoDB COMMENT='Catálogo fijo de permisos del sistema';

CREATE TABLE puesto_permisos (
  puesto_id      TINYINT UNSIGNED NOT NULL,
  permiso_codigo VARCHAR(50)      NOT NULL,
  PRIMARY KEY (puesto_id, permiso_codigo),
  KEY ix_pp_permiso (permiso_codigo),
  CONSTRAINT fk_pp_puesto  FOREIGN KEY (puesto_id)      REFERENCES puestos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pp_permiso FOREIGN KEY (permiso_codigo) REFERENCES permisos(codigo) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Qué puede hacer cada puesto';

CREATE TABLE usuarios (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula                   VARCHAR(20)  NOT NULL,
  nombre                   VARCHAR(60)  NOT NULL,
  apellido                 VARCHAR(80)  NOT NULL,
  nombre_completo          VARCHAR(145) GENERATED ALWAYS AS (CONCAT(nombre, ' ', apellido)) STORED,
  puesto_id                TINYINT UNSIGNED NOT NULL,
  password_hash            VARCHAR(100) NOT NULL,
  requiere_cambio_password TINYINT(1)   NOT NULL DEFAULT 1,
  es_admin                 TINYINT(1)   NOT NULL DEFAULT 0,
  activo                   TINYINT(1)   NOT NULL DEFAULT 1,
  telefono                 VARCHAR(20)  NULL,
  email                    VARCHAR(120) NULL,
  ultimo_acceso            DATETIME     NULL,
  intentos_fallidos        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta          DATETIME     NULL,
  creado_por               INT UNSIGNED NULL,
  creado_en                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_cedula (cedula),
  KEY ix_usuarios_puesto  (puesto_id, activo),
  KEY ix_usuarios_nombre  (apellido, nombre),
  CONSTRAINT fk_usuarios_puesto  FOREIGN KEY (puesto_id)  REFERENCES puestos(id),
  CONSTRAINT fk_usuarios_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB COMMENT='Login por cédula; password bcrypt';

CREATE TABLE sesiones (
  id           CHAR(36)     NOT NULL,
  usuario_id   INT UNSIGNED NOT NULL,
  token_hash   CHAR(64)     NOT NULL,
  ip           VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  emitida_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en    DATETIME     NOT NULL,
  revocada_en  DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesiones_token (token_hash),
  KEY ix_sesiones_usuario (usuario_id, revocada_en, expira_en),
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Refresh tokens de sesión';

CREATE TABLE auditoria (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tabla          VARCHAR(64)  NOT NULL,
  registro_id    BIGINT UNSIGNED NOT NULL,
  accion         ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','RESET_PASSWORD') NOT NULL,
  usuario_id     INT UNSIGNED NULL,
  datos_antes    JSON NULL,
  datos_despues  JSON NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_aud_tabla   (tabla, registro_id, creado_en),
  KEY ix_aud_usuario (usuario_id, creado_en)
) ENGINE=InnoDB COMMENT='Bitácora general de cambios';

-- =====================================================================
--  BLOQUE 2 · CATÁLOGOS
-- =====================================================================

CREATE TABLE tipos_trabajo (
  id                   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo               VARCHAR(30) NOT NULL,
  nombre               VARCHAR(60) NOT NULL,
  dias_habiles_entrega SMALLINT UNSIGNED NOT NULL COMMENT 'Plazo de producción en días hábiles',
  dias_alerta_previa   TINYINT UNSIGNED  NOT NULL COMMENT 'Días antes del vencimiento en que aparece la alerta',
  requiere_imagen      TINYINT(1) NOT NULL DEFAULT 1,
  orden_visual         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  activo               TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tt_codigo (codigo),
  UNIQUE KEY uq_tt_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE etapas (
  id                    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo                VARCHAR(30) NOT NULL,
  nombre                VARCHAR(40) NOT NULL,
  icono                 VARCHAR(40) NOT NULL COMMENT 'Nombre del ícono lucide-react',
  color                 CHAR(7)     NOT NULL DEFAULT '#64748b',
  puesto_responsable_id TINYINT UNSIGNED NULL COMMENT 'Puesto que normalmente marca esta etapa',
  PRIMARY KEY (id),
  UNIQUE KEY uq_etapas_codigo (codigo),
  CONSTRAINT fk_etapas_puesto FOREIGN KEY (puesto_responsable_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE flujo_etapas (
  tipo_trabajo_id       TINYINT UNSIGNED NOT NULL,
  secuencia             TINYINT UNSIGNED NOT NULL,
  etapa_id              TINYINT UNSIGNED NOT NULL,
  omitir_sin_cambios    TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (tipo_trabajo_id, secuencia),
  UNIQUE KEY uq_flujo_etapa (tipo_trabajo_id, etapa_id),
  KEY ix_flujo_etapa (etapa_id),
  CONSTRAINT fk_flujo_tipo  FOREIGN KEY (tipo_trabajo_id) REFERENCES tipos_trabajo(id) ON DELETE CASCADE,
  CONSTRAINT fk_flujo_etapa FOREIGN KEY (etapa_id)        REFERENCES etapas(id)
) ENGINE=InnoDB COMMENT='Define el recorrido de etapas de cada categoría';

CREATE TABLE tintas (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  hex    CHAR(7)     NOT NULL DEFAULT '#000000',
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tintas_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE tipos_papel (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_papel_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE tamanos_talonario (
  id           TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(20) NOT NULL,
  orden_visual TINYINT UNSIGNED NOT NULL DEFAULT 0,
  activo       TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tam_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE tipos_copia (
  id             TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(20) NOT NULL,
  cantidad_hojas TINYINT UNSIGNED NOT NULL COMMENT '1=Sencillo, 2=Duplicado, 3=Triplicado, 4=Cuadruplicado',
  activo         TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_copia_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE tipos_sobre (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sobre_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE materiales_latex (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_matlatex_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE telas (
  id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_telas_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE costureras (
  id        SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(120) NOT NULL,
  telefono  VARCHAR(20)  NULL,
  notas     VARCHAR(255) NULL,
  activo    TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_costureras_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE feriados (
  fecha       DATE NOT NULL,
  descripcion VARCHAR(80) NOT NULL,
  PRIMARY KEY (fecha)
) ENGINE=InnoDB COMMENT='Se descuentan al calcular días hábiles';

CREATE TABLE secuencias (
  nombre VARCHAR(30)     NOT NULL,
  valor  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (nombre)
) ENGINE=InnoDB COMMENT='Contadores atómicos (número de orden)';

-- =====================================================================
--  BLOQUE 3 · CLIENTES Y SUS PRODUCTOS
-- =====================================================================

CREATE TABLE clientes (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula            VARCHAR(20)  NOT NULL,
  nombre            VARCHAR(120) NOT NULL,
  nombre_comercial  VARCHAR(120) NULL,
  telefono          VARCHAR(20)  NOT NULL,
  telefono_wa       VARCHAR(20)  NULL COMMENT 'Formato internacional sin +, ej. 50624601930',
  email_facturacion VARCHAR(120) NULL,
  notas             TEXT         NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por        INT UNSIGNED NULL,
  creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_cedula (cedula),
  KEY ix_clientes_telefono  (telefono),
  KEY ix_clientes_nombre    (nombre),
  KEY ix_clientes_comercial (nombre_comercial),
  FULLTEXT KEY ft_clientes  (nombre, nombre_comercial),
  CONSTRAINT fk_clientes_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE productos_cliente (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id        INT UNSIGNED NOT NULL,
  tipo_trabajo_id   TINYINT UNSIGNED NOT NULL,
  nombre_trabajo    VARCHAR(150) NOT NULL,
  perfil_impresion  VARCHAR(120) NULL COMMENT 'Solo Textil',
  especificaciones  JSON NULL COMMENT 'Snapshot de la última configuración usada',
  veces_solicitado  INT UNSIGNED NOT NULL DEFAULT 0,
  primera_fecha     DATE NULL,
  ultima_fecha      DATE NULL,
  ultima_orden_id   BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_producto (cliente_id, tipo_trabajo_id, nombre_trabajo),
  KEY ix_producto_cliente (cliente_id, ultima_fecha DESC),
  KEY ix_producto_tipo (tipo_trabajo_id),
  CONSTRAINT fk_prod_cliente FOREIGN KEY (cliente_id)      REFERENCES clientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_prod_tipo    FOREIGN KEY (tipo_trabajo_id) REFERENCES tipos_trabajo(id)
) ENGINE=InnoDB COMMENT='Historial de artículos por cliente';

-- =====================================================================
--  BLOQUE 4 · ÓRDENES Y LÍNEAS DE TRABAJO
-- =====================================================================

CREATE TABLE ordenes (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_orden   INT UNSIGNED NOT NULL COMMENT 'Autogenerado, inmutable',
  cliente_id     INT UNSIGNED NOT NULL,
  vendedor_id    INT UNSIGNED NOT NULL,
  fecha_ingreso  DATE NOT NULL,
  fecha_entrega  DATE NULL COMMENT 'Máximo de las fechas de sus líneas',
  estado         ENUM('ABIERTA','FINALIZADA','ENTREGADA','ANULADA') NOT NULL DEFAULT 'ABIERTA',
  observaciones  TEXT NULL,
  creado_por     INT UNSIGNED NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  finalizada_en  DATETIME NULL,
  entregada_en   DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ordenes_numero (numero_orden),
  KEY ix_ordenes_estado_entrega (estado, fecha_entrega),
  KEY ix_ordenes_vendedor       (vendedor_id, estado, fecha_entrega),
  KEY ix_ordenes_cliente        (cliente_id, fecha_ingreso DESC),
  KEY ix_ordenes_ingreso        (fecha_ingreso DESC),
  CONSTRAINT fk_ord_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id),
  CONSTRAINT fk_ord_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ord_creador  FOREIGN KEY (creado_por)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE orden_lineas (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id            BIGINT UNSIGNED NOT NULL,
  linea               SMALLINT UNSIGNED NOT NULL COMMENT 'Consecutivo dentro de la orden',
  tipo_trabajo_id     TINYINT UNSIGNED NOT NULL,
  nombre_trabajo      VARCHAR(150) NOT NULL,
  cantidad            INT UNSIGNED NOT NULL DEFAULT 1,
  archivo_sin_cambios TINYINT(1)   NOT NULL DEFAULT 0,
  observaciones       TEXT NULL,
  producto_id         INT UNSIGNED NULL,
  -- Estado desnormalizado (lo mantienen los triggers) para dashboards rápidos
  etapa_actual_id     TINYINT UNSIGNED NULL,
  secuencia_actual    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  disenador_id        INT UNSIGNED NULL COMMENT 'Diseñador que tomó la orden',
  tomada_en           DATETIME NULL,
  fecha_entrega       DATE NULL COMMENT 'Calculada por tipo de trabajo',
  ultimo_cambio_etapa DATETIME NULL,
  finalizada          TINYINT(1) NOT NULL DEFAULT 0,
  entregada           TINYINT(1) NOT NULL DEFAULT 0,
  creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orden_linea (orden_id, linea),
  KEY ix_lin_pendientes  (finalizada, fecha_entrega),
  KEY ix_lin_sin_tomar   (disenador_id, finalizada, creado_en),
  KEY ix_lin_disenador   (disenador_id, finalizada),
  KEY ix_lin_estancadas  (finalizada, ultimo_cambio_etapa),
  KEY ix_lin_tipo        (tipo_trabajo_id, finalizada),
  KEY ix_lin_etapa       (etapa_actual_id),
  KEY ix_lin_producto    (producto_id),
  CONSTRAINT fk_lin_orden     FOREIGN KEY (orden_id)        REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_lin_tipo      FOREIGN KEY (tipo_trabajo_id) REFERENCES tipos_trabajo(id),
  CONSTRAINT fk_lin_etapa     FOREIGN KEY (etapa_actual_id) REFERENCES etapas(id),
  CONSTRAINT fk_lin_disenador FOREIGN KEY (disenador_id)    REFERENCES usuarios(id),
  CONSTRAINT fk_lin_producto  FOREIGN KEY (producto_id)     REFERENCES productos_cliente(id)
) ENGINE=InnoDB COMMENT='Una fila por tipo de trabajo dentro de la orden';

-- ---------- Detalles específicos por categoría ----------

CREATE TABLE detalle_talonario (
  linea_id           BIGINT UNSIGNED NOT NULL,
  cantidad_blocks    INT NOT NULL,
  hojas_por_block    INT NOT NULL COMMENT '"Blocks de ..."',
  total_hojas        INT GENERATED ALWAYS AS (cantidad_blocks * hojas_por_block) STORED,
  tamano_id          TINYINT UNSIGNED NULL,
  tamano_otro        VARCHAR(50) NULL,
  tipo_copia_id      TINYINT UNSIGNED NOT NULL,
  tinta              VARCHAR(100) NOT NULL,
  encolado           TINYINT(1) NOT NULL DEFAULT 0,
  perforado          TINYINT(1) NOT NULL DEFAULT 0,
  grapado            TINYINT(1) NOT NULL DEFAULT 0,
  numeracion_inicial BIGINT NULL,
  -- NF = NI + (Blocks x Hojas por block) - 1.  Si NI es NULL, NF queda NULL.
  numeracion_final   BIGINT GENERATED ALWAYS AS
      (numeracion_inicial + (cantidad_blocks * hojas_por_block) - 1) STORED,
  PRIMARY KEY (linea_id),
  KEY ix_talon_tamano (tamano_id),
  KEY ix_talon_copia  (tipo_copia_id),
  KEY ix_talon_num    (numeracion_inicial, numeracion_final),
  CONSTRAINT chk_talon_tamano CHECK (tamano_id IS NOT NULL OR tamano_otro IS NOT NULL),
  CONSTRAINT chk_talon_blocks CHECK (cantidad_blocks > 0 AND hojas_por_block > 0),
  CONSTRAINT fk_talon_linea  FOREIGN KEY (linea_id)      REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_talon_tamano FOREIGN KEY (tamano_id)     REFERENCES tamanos_talonario(id),
  CONSTRAINT fk_talon_copia  FOREIGN KEY (tipo_copia_id) REFERENCES tipos_copia(id)
) ENGINE=InnoDB;

CREATE TABLE talonario_copias (
  linea_id  BIGINT UNSIGNED NOT NULL,
  posicion  TINYINT UNSIGNED NOT NULL COMMENT '1 = original, 2..n = siguientes',
  rol       ENUM('ORIGINAL','INTERMEDIO','FINAL') NOT NULL,
  papel_id  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (linea_id, posicion),
  KEY ix_tc_papel (papel_id),
  CONSTRAINT fk_tc_linea FOREIGN KEY (linea_id) REFERENCES detalle_talonario(linea_id) ON DELETE CASCADE,
  CONSTRAINT fk_tc_papel FOREIGN KEY (papel_id) REFERENCES tipos_papel(id)
) ENGINE=InnoDB COMMENT='Color/papel de cada copia del talonario';

CREATE TABLE detalle_sobre (
  linea_id       BIGINT UNSIGNED NOT NULL,
  tipo_sobre_id  TINYINT UNSIGNED NOT NULL,
  tinta          VARCHAR(100) NOT NULL,
  PRIMARY KEY (linea_id),
  KEY ix_ds_tipo (tipo_sobre_id),
  CONSTRAINT fk_ds_linea FOREIGN KEY (linea_id)      REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ds_tipo  FOREIGN KEY (tipo_sobre_id) REFERENCES tipos_sobre(id)
) ENGINE=InnoDB;

CREATE TABLE detalle_latex (
  linea_id     BIGINT UNSIGNED NOT NULL,
  tamano       VARCHAR(60) NOT NULL,
  material_id  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (linea_id),
  KEY ix_dl_material (material_id),
  CONSTRAINT fk_dl_linea    FOREIGN KEY (linea_id)    REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_material FOREIGN KEY (material_id) REFERENCES materiales_latex(id)
) ENGINE=InnoDB COMMENT='HP Latex e Impresión Digital';

CREATE TABLE detalle_textil (
  linea_id         BIGINT UNSIGNED NOT NULL,
  tela_id          TINYINT UNSIGNED NOT NULL,
  perfil_impresion VARCHAR(120) NULL,
  costurera_id     SMALLINT UNSIGNED NULL,
  PRIMARY KEY (linea_id),
  KEY ix_dt_tela      (tela_id),
  KEY ix_dt_costurera (costurera_id),
  CONSTRAINT fk_dt_linea     FOREIGN KEY (linea_id)     REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_dt_tela      FOREIGN KEY (tela_id)      REFERENCES telas(id),
  CONSTRAINT fk_dt_costurera FOREIGN KEY (costurera_id) REFERENCES costureras(id)
) ENGINE=InnoDB;

CREATE TABLE detalle_sello (
  linea_id      BIGINT UNSIGNED NOT NULL,
  codigo_sello  VARCHAR(40) NULL,
  tinta_id      TINYINT UNSIGNED NULL,
  PRIMARY KEY (linea_id),
  KEY ix_dsel_tinta (tinta_id),
  CONSTRAINT fk_dsel_linea FOREIGN KEY (linea_id) REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_dsel_tinta FOREIGN KEY (tinta_id) REFERENCES tintas(id)
) ENGINE=InnoDB;

-- ---------- Historial de etapas y archivos ----------

CREATE TABLE linea_etapas (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  linea_id         BIGINT UNSIGNED NOT NULL,
  etapa_id         TINYINT UNSIGNED NOT NULL,
  secuencia        TINYINT UNSIGNED NOT NULL,
  usuario_id       INT UNSIGNED NULL COMMENT 'Quién marcó la etapa',
  marcada_en       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  minutos_en_etapa INT UNSIGNED NULL COMMENT 'Tiempo transcurrido desde la etapa anterior',
  nota             VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_le_linea_etapa (linea_id, etapa_id),
  KEY ix_le_linea    (linea_id, secuencia),
  KEY ix_le_bitacora (usuario_id, marcada_en),
  KEY ix_le_etapa    (etapa_id, marcada_en),
  CONSTRAINT fk_le_linea   FOREIGN KEY (linea_id)   REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_le_etapa   FOREIGN KEY (etapa_id)   REFERENCES etapas(id),
  CONSTRAINT fk_le_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB COMMENT='Trazabilidad completa: qué, cuándo y quién';

CREATE TABLE linea_archivos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  linea_id       BIGINT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta           VARCHAR(400) NOT NULL,
  mime           VARCHAR(60)  NOT NULL,
  bytes          INT UNSIGNED NOT NULL,
  ancho_px       SMALLINT UNSIGNED NULL,
  alto_px        SMALLINT UNSIGNED NULL,
  subido_por     INT UNSIGNED NOT NULL,
  subido_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_la_linea (linea_id, subido_en DESC),
  CONSTRAINT fk_la_linea   FOREIGN KEY (linea_id)   REFERENCES orden_lineas(id) ON DELETE CASCADE,
  CONSTRAINT fk_la_usuario FOREIGN KEY (subido_por) REFERENCES usuarios(id)
) ENGINE=InnoDB COMMENT='Muestras JPG/PNG del trabajo';

-- =====================================================================
--  BLOQUE 5 · INVENTARIO DE SELLOS
-- =====================================================================

CREATE TABLE sellos_inventario (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(40)  NOT NULL,
  descripcion    VARCHAR(120) NULL,
  tinta_id       TINYINT UNSIGNED NOT NULL,
  cantidad       INT NOT NULL DEFAULT 0,
  minimo         INT NOT NULL DEFAULT 0,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sellos_codigo (codigo),
  KEY ix_sellos_tinta (tinta_id, codigo),
  CONSTRAINT chk_sellos_cant CHECK (cantidad >= 0),
  CONSTRAINT fk_sellos_tinta FOREIGN KEY (tinta_id) REFERENCES tintas(id)
) ENGINE=InnoDB;

CREATE TABLE sellos_movimientos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sello_id       INT UNSIGNED NOT NULL,
  tipo           ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  cantidad       INT NOT NULL,
  saldo_anterior INT NOT NULL,
  saldo_nuevo    INT NOT NULL,
  motivo         VARCHAR(150) NULL,
  usuario_id     INT UNSIGNED NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_sm_sello (sello_id, creado_en DESC),
  CONSTRAINT fk_sm_sello   FOREIGN KEY (sello_id)   REFERENCES sellos_inventario(id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- =====================================================================
--  BLOQUE 6 · SOLICITUDES DE MATERIAL
-- =====================================================================

CREATE TABLE solicitudes_material (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED NOT NULL,
  estado       ENUM('PENDIENTE','APROBADA','COMPRADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  nota         VARCHAR(255) NULL,
  atendida_por INT UNSIGNED NULL,
  atendida_en  DATETIME NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_sol_estado  (estado, creado_en DESC),
  KEY ix_sol_usuario (usuario_id, creado_en DESC),
  CONSTRAINT fk_sol_usuario  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
  CONSTRAINT fk_sol_atendida FOREIGN KEY (atendida_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE solicitud_material_lineas (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id BIGINT UNSIGNED NOT NULL,
  linea        SMALLINT UNSIGNED NOT NULL,
  cantidad     VARCHAR(30)  NOT NULL,
  producto     VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sml (solicitud_id, linea),
  CONSTRAINT fk_sml_sol FOREIGN KEY (solicitud_id) REFERENCES solicitudes_material(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
--  BLOQUE 7 · NOTIFICACIONES Y WHATSAPP
-- =====================================================================

CREATE TABLE notificaciones (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo         ENUM('ORDEN_CREADA','ORDEN_FINALIZADA','ORDEN_ESTANCADA','ORDEN_POR_VENCER',
                    'SOLICITUD_MATERIAL','SELLO_BAJO_MINIMO','SISTEMA') NOT NULL,
  titulo       VARCHAR(120) NOT NULL,
  mensaje      VARCHAR(500) NOT NULL,
  orden_id     BIGINT UNSIGNED NULL,
  linea_id     BIGINT UNSIGNED NULL,
  url_destino  VARCHAR(200) NULL,
  generada_por INT UNSIGNED NULL,
  creada_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_notif_fecha (creada_en DESC),
  KEY ix_notif_orden (orden_id),
  CONSTRAINT fk_notif_orden FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notificacion_destinatarios (
  notificacion_id BIGINT UNSIGNED NOT NULL,
  usuario_id      INT UNSIGNED NOT NULL,
  leida_en        DATETIME NULL,
  PRIMARY KEY (notificacion_id, usuario_id),
  KEY ix_nd_pendientes (usuario_id, leida_en, notificacion_id),
  CONSTRAINT fk_nd_notif   FOREIGN KEY (notificacion_id) REFERENCES notificaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_nd_usuario FOREIGN KEY (usuario_id)      REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='La "bolita" sale de leida_en IS NULL';

CREATE TABLE whatsapp_cola (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id   BIGINT UNSIGNED NULL,
  telefono   VARCHAR(20) NOT NULL,
  plantilla  ENUM('ORDEN_CREADA','ORDEN_LISTA','OTRO') NOT NULL,
  mensaje    TEXT NOT NULL,
  estado     ENUM('PENDIENTE','ENVIADO','ERROR','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  intentos   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  error      VARCHAR(255) NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_wa_estado (estado, creado_en),
  KEY ix_wa_orden  (orden_id),
  CONSTRAINT fk_wa_orden FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Cola de salida; el backend la procesa';
