-- MySQL dump 10.13  Distrib 8.4.10, for Linux (aarch64)
--
-- Host: localhost    Database: imprenta
-- ------------------------------------------------------
-- Server version	8.4.10

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auditoria`
--

DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tabla` varchar(64) NOT NULL,
  `registro_id` bigint unsigned NOT NULL,
  `accion` enum('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','RESET_PASSWORD') NOT NULL,
  `usuario_id` int unsigned DEFAULT NULL,
  `datos_antes` json DEFAULT NULL,
  `datos_despues` json DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_aud_tabla` (`tabla`,`registro_id`,`creado_en`),
  KEY `ix_aud_usuario` (`usuario_id`,`creado_en`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bitácora general de cambios';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cedula` varchar(20) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `nombre_comercial` varchar(120) DEFAULT NULL,
  `telefono` varchar(20) NOT NULL,
  `telefono_wa` varchar(20) DEFAULT NULL COMMENT 'Formato internacional sin +, ej. 50624601930',
  `email_facturacion` varchar(120) DEFAULT NULL,
  `notas` text,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_por` int unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_cedula` (`cedula`),
  KEY `ix_clientes_telefono` (`telefono`),
  KEY `ix_clientes_nombre` (`nombre`),
  KEY `ix_clientes_comercial` (`nombre_comercial`),
  KEY `fk_clientes_creador` (`creado_por`),
  FULLTEXT KEY `ft_clientes` (`nombre`,`nombre_comercial`),
  CONSTRAINT `fk_clientes_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costureras`
--

DROP TABLE IF EXISTS `costureras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costureras` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_costureras_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_latex`
--

DROP TABLE IF EXISTS `detalle_latex`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_latex` (
  `linea_id` bigint unsigned NOT NULL,
  `tamano` varchar(60) NOT NULL,
  `material_id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`linea_id`),
  KEY `ix_dl_material` (`material_id`),
  CONSTRAINT `fk_dl_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dl_material` FOREIGN KEY (`material_id`) REFERENCES `materiales_latex` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='HP Latex e Impresión Digital';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_sello`
--

DROP TABLE IF EXISTS `detalle_sello`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_sello` (
  `linea_id` bigint unsigned NOT NULL,
  `codigo_sello` varchar(40) DEFAULT NULL,
  `tinta_id` tinyint unsigned DEFAULT NULL,
  PRIMARY KEY (`linea_id`),
  KEY `ix_dsel_tinta` (`tinta_id`),
  CONSTRAINT `fk_dsel_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dsel_tinta` FOREIGN KEY (`tinta_id`) REFERENCES `tintas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_sobre`
--

DROP TABLE IF EXISTS `detalle_sobre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_sobre` (
  `linea_id` bigint unsigned NOT NULL,
  `tipo_sobre_id` tinyint unsigned NOT NULL,
  `tinta` varchar(100) NOT NULL,
  PRIMARY KEY (`linea_id`),
  KEY `ix_ds_tipo` (`tipo_sobre_id`),
  CONSTRAINT `fk_ds_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ds_tipo` FOREIGN KEY (`tipo_sobre_id`) REFERENCES `tipos_sobre` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_talonario`
--

DROP TABLE IF EXISTS `detalle_talonario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_talonario` (
  `linea_id` bigint unsigned NOT NULL,
  `cantidad_blocks` int NOT NULL,
  `hojas_por_block` int NOT NULL COMMENT '"Blocks de ..."',
  `total_hojas` int GENERATED ALWAYS AS ((`cantidad_blocks` * `hojas_por_block`)) STORED,
  `tamano_id` tinyint unsigned DEFAULT NULL,
  `tamano_otro` varchar(50) DEFAULT NULL,
  `tipo_copia_id` tinyint unsigned NOT NULL,
  `tinta` varchar(100) NOT NULL,
  `encolado` tinyint(1) NOT NULL DEFAULT '0',
  `perforado` tinyint(1) NOT NULL DEFAULT '0',
  `grapado` tinyint(1) NOT NULL DEFAULT '0',
  `carbon` tinyint(1) NOT NULL DEFAULT '0',
  `numeracion_inicial` bigint DEFAULT NULL,
  `numeracion_final` bigint GENERATED ALWAYS AS (((`numeracion_inicial` + (`cantidad_blocks` * `hojas_por_block`)) - 1)) STORED,
  PRIMARY KEY (`linea_id`),
  KEY `ix_talon_tamano` (`tamano_id`),
  KEY `ix_talon_copia` (`tipo_copia_id`),
  KEY `ix_talon_num` (`numeracion_inicial`,`numeracion_final`),
  CONSTRAINT `fk_talon_copia` FOREIGN KEY (`tipo_copia_id`) REFERENCES `tipos_copia` (`id`),
  CONSTRAINT `fk_talon_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_talon_tamano` FOREIGN KEY (`tamano_id`) REFERENCES `tamanos_talonario` (`id`),
  CONSTRAINT `chk_talon_blocks` CHECK (((`cantidad_blocks` > 0) and (`hojas_por_block` > 0))),
  CONSTRAINT `chk_talon_tamano` CHECK (((`tamano_id` is not null) or (`tamano_otro` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_textil`
--

DROP TABLE IF EXISTS `detalle_textil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_textil` (
  `linea_id` bigint unsigned NOT NULL,
  `tela_id` tinyint unsigned NOT NULL,
  `perfil_impresion` varchar(120) DEFAULT NULL,
  `costurera_id` smallint unsigned DEFAULT NULL,
  `sin_confeccion` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'El cliente hace la confección; no se asigna costurera',
  PRIMARY KEY (`linea_id`),
  KEY `ix_dt_tela` (`tela_id`),
  KEY `ix_dt_costurera` (`costurera_id`),
  CONSTRAINT `fk_dt_costurera` FOREIGN KEY (`costurera_id`) REFERENCES `costureras` (`id`),
  CONSTRAINT `fk_dt_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dt_tela` FOREIGN KEY (`tela_id`) REFERENCES `telas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `encomiendas`
--

DROP TABLE IF EXISTS `encomiendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `encomiendas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `direccion` enum('ENVIADA','RECIBIDA') NOT NULL COMMENT 'ENVIADA: San Carlos a San José. RECIBIDA: San José a San Carlos',
  `numero_guia` varchar(30) DEFAULT NULL,
  `status` enum('CONTADO','POR_COBRAR') DEFAULT NULL,
  `monto` decimal(12,2) DEFAULT NULL,
  `persona_envia` varchar(120) DEFAULT NULL,
  `persona_recibe` varchar(120) DEFAULT NULL,
  `destino` varchar(120) DEFAULT NULL,
  `retirado_por` varchar(120) DEFAULT NULL,
  `entregada_en` datetime DEFAULT NULL,
  `entregada_por` int unsigned DEFAULT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `registrado_por` int unsigned NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_enc_fecha` (`fecha` DESC,`direccion`),
  KEY `ix_enc_guia` (`numero_guia`),
  KEY `ix_enc_status` (`status`,`fecha`),
  KEY `fk_enc_usuario` (`registrado_por`),
  KEY `ix_enc_pendientes` (`direccion`,`entregada_en`),
  KEY `fk_enc_entregada` (`entregada_por`),
  CONSTRAINT `fk_enc_entregada` FOREIGN KEY (`entregada_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_enc_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bitácora de encomiendas entre bodegas';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `etapas`
--

DROP TABLE IF EXISTS `etapas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etapas` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `icono` varchar(40) NOT NULL COMMENT 'Nombre del ícono lucide-react',
  `color` char(7) NOT NULL DEFAULT '#64748b',
  `puesto_responsable_id` tinyint unsigned DEFAULT NULL COMMENT 'Puesto que normalmente marca esta etapa',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_etapas_codigo` (`codigo`),
  KEY `fk_etapas_puesto` (`puesto_responsable_id`),
  CONSTRAINT `fk_etapas_puesto` FOREIGN KEY (`puesto_responsable_id`) REFERENCES `puestos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feriados`
--

DROP TABLE IF EXISTS `feriados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feriados` (
  `fecha` date NOT NULL,
  `descripcion` varchar(80) NOT NULL,
  PRIMARY KEY (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Se descuentan al calcular días hábiles';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `flujo_etapas`
--

DROP TABLE IF EXISTS `flujo_etapas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flujo_etapas` (
  `tipo_trabajo_id` tinyint unsigned NOT NULL,
  `secuencia` tinyint unsigned NOT NULL,
  `etapa_id` tinyint unsigned NOT NULL,
  `omitir_sin_cambios` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`tipo_trabajo_id`,`secuencia`),
  UNIQUE KEY `uq_flujo_etapa` (`tipo_trabajo_id`,`etapa_id`),
  KEY `ix_flujo_etapa` (`etapa_id`),
  CONSTRAINT `fk_flujo_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapas` (`id`),
  CONSTRAINT `fk_flujo_tipo` FOREIGN KEY (`tipo_trabajo_id`) REFERENCES `tipos_trabajo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Define el recorrido de etapas de cada categoría';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `linea_archivos`
--

DROP TABLE IF EXISTS `linea_archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linea_archivos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linea_id` bigint unsigned NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `ruta` varchar(400) NOT NULL,
  `mime` varchar(60) NOT NULL,
  `bytes` int unsigned NOT NULL,
  `ancho_px` smallint unsigned DEFAULT NULL,
  `alto_px` smallint unsigned DEFAULT NULL,
  `subido_por` int unsigned NOT NULL,
  `subido_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_la_linea` (`linea_id`,`subido_en` DESC),
  KEY `fk_la_usuario` (`subido_por`),
  CONSTRAINT `fk_la_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_la_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Muestras JPG/PNG del trabajo';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `linea_etapas`
--

DROP TABLE IF EXISTS `linea_etapas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `linea_etapas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linea_id` bigint unsigned NOT NULL,
  `etapa_id` tinyint unsigned NOT NULL,
  `secuencia` tinyint unsigned NOT NULL,
  `usuario_id` int unsigned DEFAULT NULL COMMENT 'Quién marcó la etapa',
  `marcada_en` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `minutos_en_etapa` int unsigned DEFAULT NULL COMMENT 'Tiempo transcurrido desde la etapa anterior',
  `nota` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_le_linea_etapa` (`linea_id`,`etapa_id`),
  KEY `ix_le_linea` (`linea_id`,`secuencia`),
  KEY `ix_le_bitacora` (`usuario_id`,`marcada_en`),
  KEY `ix_le_etapa` (`etapa_id`,`marcada_en`),
  CONSTRAINT `fk_le_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapas` (`id`),
  CONSTRAINT `fk_le_linea` FOREIGN KEY (`linea_id`) REFERENCES `orden_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_le_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Trazabilidad completa: qué, cuándo y quién';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `bi_linea_etapas` BEFORE INSERT ON `linea_etapas` FOR EACH ROW BEGIN
  DECLARE v_anterior DATETIME;
  SELECT ultimo_cambio_etapa INTO v_anterior FROM orden_lineas WHERE id = NEW.linea_id;
  IF v_anterior IS NOT NULL THEN
    SET NEW.minutos_en_etapa = TIMESTAMPDIFF(MINUTE, v_anterior, NEW.marcada_en);
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `ai_linea_etapas` AFTER INSERT ON `linea_etapas` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `materiales_latex`
--

DROP TABLE IF EXISTS `materiales_latex`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materiales_latex` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_matlatex_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notificacion_destinatarios`
--

DROP TABLE IF EXISTS `notificacion_destinatarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacion_destinatarios` (
  `notificacion_id` bigint unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `leida_en` datetime DEFAULT NULL,
  PRIMARY KEY (`notificacion_id`,`usuario_id`),
  KEY `ix_nd_pendientes` (`usuario_id`,`leida_en`,`notificacion_id`),
  CONSTRAINT `fk_nd_notif` FOREIGN KEY (`notificacion_id`) REFERENCES `notificaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nd_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='La "bolita" sale de leida_en IS NULL';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tipo` enum('ORDEN_CREADA','ORDEN_FINALIZADA','ORDEN_ESTANCADA','ORDEN_POR_VENCER','SOLICITUD_MATERIAL','PEDIDO_CAMISETAS','SELLO_BAJO_MINIMO','SISTEMA') NOT NULL,
  `titulo` varchar(120) NOT NULL,
  `mensaje` varchar(500) NOT NULL,
  `orden_id` bigint unsigned DEFAULT NULL,
  `linea_id` bigint unsigned DEFAULT NULL,
  `url_destino` varchar(200) DEFAULT NULL,
  `generada_por` int unsigned DEFAULT NULL,
  `creada_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_notif_fecha` (`creada_en` DESC),
  KEY `ix_notif_orden` (`orden_id`),
  CONSTRAINT `fk_notif_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orden_lineas`
--

DROP TABLE IF EXISTS `orden_lineas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orden_lineas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `orden_id` bigint unsigned NOT NULL,
  `linea` smallint unsigned NOT NULL COMMENT 'Consecutivo dentro de la orden',
  `tipo_trabajo_id` tinyint unsigned NOT NULL,
  `nombre_trabajo` varchar(150) NOT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `archivo_sin_cambios` tinyint(1) NOT NULL DEFAULT '0',
  `observaciones` text,
  `producto_id` int unsigned DEFAULT NULL,
  `etapa_actual_id` tinyint unsigned DEFAULT NULL,
  `secuencia_actual` tinyint unsigned NOT NULL DEFAULT '0',
  `disenador_id` int unsigned DEFAULT NULL COMMENT 'Diseñador que tomó la orden',
  `tomada_en` datetime DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL COMMENT 'Calculada por tipo de trabajo',
  `ultimo_cambio_etapa` datetime DEFAULT NULL,
  `finalizada` tinyint(1) NOT NULL DEFAULT '0',
  `entregada` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orden_linea` (`orden_id`,`linea`),
  KEY `ix_lin_pendientes` (`finalizada`,`fecha_entrega`),
  KEY `ix_lin_sin_tomar` (`disenador_id`,`finalizada`,`creado_en`),
  KEY `ix_lin_disenador` (`disenador_id`,`finalizada`),
  KEY `ix_lin_estancadas` (`finalizada`,`ultimo_cambio_etapa`),
  KEY `ix_lin_tipo` (`tipo_trabajo_id`,`finalizada`),
  KEY `ix_lin_etapa` (`etapa_actual_id`),
  KEY `ix_lin_producto` (`producto_id`),
  CONSTRAINT `fk_lin_disenador` FOREIGN KEY (`disenador_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_lin_etapa` FOREIGN KEY (`etapa_actual_id`) REFERENCES `etapas` (`id`),
  CONSTRAINT `fk_lin_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lin_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos_cliente` (`id`),
  CONSTRAINT `fk_lin_tipo` FOREIGN KEY (`tipo_trabajo_id`) REFERENCES `tipos_trabajo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Una fila por tipo de trabajo dentro de la orden';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `bi_orden_lineas` BEFORE INSERT ON `orden_lineas` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `ai_orden_lineas` AFTER INSERT ON `orden_lineas` FOR EACH ROW BEGIN
  UPDATE ordenes
     SET fecha_entrega = GREATEST(COALESCE(fecha_entrega, NEW.fecha_entrega), NEW.fecha_entrega)
   WHERE id = NEW.orden_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ordenes`
--

DROP TABLE IF EXISTS `ordenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `numero_orden` int unsigned NOT NULL COMMENT 'Autogenerado, inmutable',
  `cliente_id` int unsigned NOT NULL,
  `vendedor_id` int unsigned NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_entrega` date DEFAULT NULL COMMENT 'Máximo de las fechas de sus líneas',
  `medio_muestra` enum('WHATSAPP','EMAIL','VENDEDOR') DEFAULT NULL COMMENT 'Canal para enviar la muestra al cliente',
  `email_muestra` varchar(120) DEFAULT NULL,
  `estado` enum('ABIERTA','FINALIZADA','ENTREGADA','ANULADA') NOT NULL DEFAULT 'ABIERTA',
  `urgente` tinyint(1) NOT NULL DEFAULT '0',
  `motivo_urgencia` varchar(200) DEFAULT NULL,
  `observaciones` text,
  `creado_por` int unsigned NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `finalizada_en` datetime DEFAULT NULL,
  `entregada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ordenes_numero` (`numero_orden`),
  KEY `ix_ordenes_estado_entrega` (`estado`,`fecha_entrega`),
  KEY `ix_ordenes_vendedor` (`vendedor_id`,`estado`,`fecha_entrega`),
  KEY `ix_ordenes_cliente` (`cliente_id`,`fecha_ingreso` DESC),
  KEY `ix_ordenes_ingreso` (`fecha_ingreso` DESC),
  KEY `fk_ord_creador` (`creado_por`),
  KEY `ix_ordenes_urgente` (`urgente`,`fecha_entrega`),
  CONSTRAINT `fk_ord_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_ord_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_ord_vendedor` FOREIGN KEY (`vendedor_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `bi_ordenes_numero` BEFORE INSERT ON `ordenes` FOR EACH ROW BEGIN
  UPDATE secuencias SET valor = LAST_INSERT_ID(valor + 1) WHERE nombre = 'orden';
  SET NEW.numero_orden = LAST_INSERT_ID();

  IF NEW.fecha_ingreso IS NULL THEN
    SET NEW.fecha_ingreso = CURDATE();
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `ai_ordenes_whatsapp` AFTER INSERT ON `ordenes` FOR EACH ROW BEGIN
  DECLARE v_tel VARCHAR(20);
  SELECT COALESCE(telefono_wa, telefono) INTO v_tel FROM clientes WHERE id = NEW.cliente_id;

  IF v_tel IS NOT NULL THEN
    INSERT INTO whatsapp_cola (orden_id, telefono, plantilla, mensaje)
    VALUES (NEW.id, v_tel, 'ORDEN_CREADA',
            CONCAT('Estimado cliente se ha generado la orden de trabajo # ', NEW.numero_orden,
                   ', cualquier consulta comunicarse mediante whatsapp al 24601930.'));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `bu_ordenes_numero` BEFORE UPDATE ON `ordenes` FOR EACH ROW BEGIN
  IF NEW.numero_orden <> OLD.numero_orden THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El número de orden no puede modificarse';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `papeles_movimientos`
--

DROP TABLE IF EXISTS `papeles_movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `papeles_movimientos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `papel_id` tinyint unsigned NOT NULL,
  `tipo` enum('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  `cantidad` int NOT NULL,
  `saldo_anterior` int NOT NULL,
  `saldo_nuevo` int NOT NULL,
  `motivo` varchar(150) DEFAULT NULL,
  `usuario_id` int unsigned NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_pm_papel` (`papel_id`,`creado_en` DESC),
  KEY `fk_pm_usuario` (`usuario_id`),
  CONSTRAINT `fk_pm_papel` FOREIGN KEY (`papel_id`) REFERENCES `tipos_papel` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedido_camiseta_cantidades`
--

DROP TABLE IF EXISTS `pedido_camiseta_cantidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_camiseta_cantidades` (
  `linea_id` bigint unsigned NOT NULL,
  `talla_id` tinyint unsigned NOT NULL,
  `cantidad` smallint unsigned NOT NULL,
  PRIMARY KEY (`linea_id`,`talla_id`),
  KEY `ix_pcc_talla` (`talla_id`),
  CONSTRAINT `fk_pcc_linea` FOREIGN KEY (`linea_id`) REFERENCES `pedido_camiseta_lineas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pcc_talla` FOREIGN KEY (`talla_id`) REFERENCES `tallas_camiseta` (`id`),
  CONSTRAINT `chk_pcc_cant` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedido_camiseta_lineas`
--

DROP TABLE IF EXISTS `pedido_camiseta_lineas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_camiseta_lineas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pedido_id` bigint unsigned NOT NULL,
  `linea` smallint unsigned NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pcl` (`pedido_id`,`linea`),
  CONSTRAINT `fk_pcl_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_camiseta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedidos_camiseta`
--

DROP TABLE IF EXISTS `pedidos_camiseta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos_camiseta` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `cliente_id` int unsigned DEFAULT NULL COMMENT 'Opcional: para qué cliente es',
  `fecha_requerida` date NOT NULL,
  `nota` varchar(255) DEFAULT NULL,
  `estado` enum('PENDIENTE','APROBADO','ENTREGADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
  `atendido_por` int unsigned DEFAULT NULL,
  `atendido_en` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_pc_estado` (`estado`,`fecha_requerida`),
  KEY `ix_pc_usuario` (`usuario_id`,`creado_en` DESC),
  KEY `fk_pc_cliente` (`cliente_id`),
  KEY `fk_pc_atendido` (`atendido_por`),
  CONSTRAINT `fk_pc_atendido` FOREIGN KEY (`atendido_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_pc_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_pc_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedidos_externos`
--

DROP TABLE IF EXISTS `pedidos_externos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos_externos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `orden_id` bigint unsigned NOT NULL,
  `fecha_solicitud` date NOT NULL,
  `pedido_solicitado` varchar(120) NOT NULL,
  `cantidad` varchar(60) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `retirado` tinyint(1) NOT NULL DEFAULT '0',
  `retirado_en` datetime DEFAULT NULL,
  `retirado_por` int unsigned DEFAULT NULL,
  `creado_por` int unsigned NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_pext_pendientes` (`retirado`,`fecha_solicitud`),
  KEY `ix_pext_orden` (`orden_id`),
  KEY `fk_pext_creado` (`creado_por`),
  KEY `fk_pext_retirado` (`retirado_por`),
  CONSTRAINT `fk_pext_creado` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_pext_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`),
  CONSTRAINT `fk_pext_retirado` FOREIGN KEY (`retirado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `codigo` varchar(50) NOT NULL,
  `modulo` varchar(30) NOT NULL,
  `descripcion` varchar(150) NOT NULL,
  PRIMARY KEY (`codigo`),
  KEY `ix_permisos_modulo` (`modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Catálogo fijo de permisos del sistema';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `productos_cliente`
--

DROP TABLE IF EXISTS `productos_cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos_cliente` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int unsigned NOT NULL,
  `tipo_trabajo_id` tinyint unsigned NOT NULL,
  `nombre_trabajo` varchar(150) NOT NULL,
  `perfil_impresion` varchar(120) DEFAULT NULL COMMENT 'Solo Textil',
  `especificaciones` json DEFAULT NULL COMMENT 'Snapshot de la última configuración usada',
  `veces_solicitado` int unsigned NOT NULL DEFAULT '0',
  `primera_fecha` date DEFAULT NULL,
  `ultima_fecha` date DEFAULT NULL,
  `ultima_orden_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_producto` (`cliente_id`,`tipo_trabajo_id`,`nombre_trabajo`),
  KEY `ix_producto_cliente` (`cliente_id`,`ultima_fecha` DESC),
  KEY `ix_producto_tipo` (`tipo_trabajo_id`),
  CONSTRAINT `fk_prod_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prod_tipo` FOREIGN KEY (`tipo_trabajo_id`) REFERENCES `tipos_trabajo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de artículos por cliente';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `puesto_permisos`
--

DROP TABLE IF EXISTS `puesto_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puesto_permisos` (
  `puesto_id` tinyint unsigned NOT NULL,
  `permiso_codigo` varchar(50) NOT NULL,
  PRIMARY KEY (`puesto_id`,`permiso_codigo`),
  KEY `ix_pp_permiso` (`permiso_codigo`),
  CONSTRAINT `fk_pp_permiso` FOREIGN KEY (`permiso_codigo`) REFERENCES `permisos` (`codigo`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_puesto` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Qué puede hacer cada puesto';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `puestos`
--

DROP TABLE IF EXISTS `puestos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puestos` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_puestos_codigo` (`codigo`),
  UNIQUE KEY `uq_puestos_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Puestos creados por el administrador';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `secuencias`
--

DROP TABLE IF EXISTS `secuencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `secuencias` (
  `nombre` varchar(30) NOT NULL,
  `valor` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contadores atómicos (número de orden)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sellos_inventario`
--

DROP TABLE IF EXISTS `sellos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sellos_inventario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(40) NOT NULL,
  `descripcion` varchar(120) DEFAULT NULL,
  `tinta_id` tinyint unsigned NOT NULL,
  `cantidad` int NOT NULL DEFAULT '0',
  `minimo` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sellos_codigo` (`codigo`),
  KEY `ix_sellos_tinta` (`tinta_id`,`codigo`),
  CONSTRAINT `fk_sellos_tinta` FOREIGN KEY (`tinta_id`) REFERENCES `tintas` (`id`),
  CONSTRAINT `chk_sellos_cant` CHECK ((`cantidad` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sellos_movimientos`
--

DROP TABLE IF EXISTS `sellos_movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sellos_movimientos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sello_id` int unsigned NOT NULL,
  `tipo` enum('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  `cantidad` int NOT NULL,
  `saldo_anterior` int NOT NULL,
  `saldo_nuevo` int NOT NULL,
  `motivo` varchar(150) DEFAULT NULL,
  `usuario_id` int unsigned NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_sm_sello` (`sello_id`,`creado_en` DESC),
  KEY `fk_sm_usuario` (`usuario_id`),
  CONSTRAINT `fk_sm_sello` FOREIGN KEY (`sello_id`) REFERENCES `sellos_inventario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sesiones`
--

DROP TABLE IF EXISTS `sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones` (
  `id` char(36) NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `emitida_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_en` datetime NOT NULL,
  `revocada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sesiones_token` (`token_hash`),
  KEY `ix_sesiones_usuario` (`usuario_id`,`revocada_en`,`expira_en`),
  CONSTRAINT `fk_sesiones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Refresh tokens de sesión';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `solicitud_material_lineas`
--

DROP TABLE IF EXISTS `solicitud_material_lineas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_material_lineas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` bigint unsigned NOT NULL,
  `linea` smallint unsigned NOT NULL,
  `cantidad` varchar(30) NOT NULL,
  `producto` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sml` (`solicitud_id`,`linea`),
  CONSTRAINT `fk_sml_sol` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_material` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `solicitudes_material`
--

DROP TABLE IF EXISTS `solicitudes_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `estado` enum('PENDIENTE','APROBADA','COMPRADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `nota` varchar(255) DEFAULT NULL,
  `atendida_por` int unsigned DEFAULT NULL,
  `atendida_en` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_sol_estado` (`estado`,`creado_en` DESC),
  KEY `ix_sol_usuario` (`usuario_id`,`creado_en` DESC),
  KEY `fk_sol_atendida` (`atendida_por`),
  CONSTRAINT `fk_sol_atendida` FOREIGN KEY (`atendida_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_sol_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `ai_solicitudes_material` AFTER INSERT ON `solicitudes_material` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tallas_camiseta`
--

DROP TABLE IF EXISTS `tallas_camiseta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tallas_camiseta` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `genero` enum('MUJER','HOMBRE') NOT NULL,
  `nombre` varchar(10) NOT NULL,
  `orden_visual` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_talla` (`genero`,`nombre`),
  KEY `ix_talla_orden` (`genero`,`orden_visual`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `talonario_copias`
--

DROP TABLE IF EXISTS `talonario_copias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `talonario_copias` (
  `linea_id` bigint unsigned NOT NULL,
  `posicion` tinyint unsigned NOT NULL COMMENT '1 = original, 2..n = siguientes',
  `rol` enum('ORIGINAL','INTERMEDIO','FINAL') NOT NULL,
  `papel_id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`linea_id`,`posicion`),
  KEY `ix_tc_papel` (`papel_id`),
  CONSTRAINT `fk_tc_linea` FOREIGN KEY (`linea_id`) REFERENCES `detalle_talonario` (`linea_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tc_papel` FOREIGN KEY (`papel_id`) REFERENCES `tipos_papel` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Color/papel de cada copia del talonario';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tamanos_talonario`
--

DROP TABLE IF EXISTS `tamanos_talonario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tamanos_talonario` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `orden_visual` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tam_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `telas`
--

DROP TABLE IF EXISTS `telas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telas` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telas_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tintas`
--

DROP TABLE IF EXISTS `tintas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tintas` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) NOT NULL,
  `hex` char(7) NOT NULL DEFAULT '#000000',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tintas_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_copia`
--

DROP TABLE IF EXISTS `tipos_copia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_copia` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `cantidad_hojas` tinyint unsigned NOT NULL COMMENT '1=Sencillo, 2=Duplicado, 3=Triplicado, 4=Cuadruplicado',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_copia_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_papel`
--

DROP TABLE IF EXISTS `tipos_papel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_papel` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) NOT NULL,
  `categoria` enum('BOND','BRISTOL','QUIMICO','ESPECIAL') NOT NULL DEFAULT 'ESPECIAL',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `es_original` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Papel fijo del original en talonarios con copias',
  `resmas` int NOT NULL DEFAULT '0' COMMENT 'Existencia actual',
  `minimo` int NOT NULL DEFAULT '0' COMMENT 'Avisa cuando baja de aquí',
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_papel_nombre` (`nombre`),
  KEY `ix_papel_categoria` (`categoria`,`nombre`),
  CONSTRAINT `chk_papel_resmas` CHECK ((`resmas` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_sobre`
--

DROP TABLE IF EXISTS `tipos_sobre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_sobre` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sobre_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_trabajo`
--

DROP TABLE IF EXISTS `tipos_trabajo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_trabajo` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `dias_habiles_entrega` smallint unsigned NOT NULL COMMENT 'Plazo de producción en días hábiles',
  `dias_alerta_previa` tinyint unsigned NOT NULL COMMENT 'Días antes del vencimiento en que aparece la alerta',
  `requiere_imagen` tinyint(1) NOT NULL DEFAULT '1',
  `orden_visual` tinyint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tt_codigo` (`codigo`),
  UNIQUE KEY `uq_tt_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cedula` varchar(20) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `nombre_completo` varchar(145) GENERATED ALWAYS AS (concat(`nombre`,_utf8mb4' ',`apellido`)) STORED,
  `puesto_id` tinyint unsigned NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `requiere_cambio_password` tinyint(1) NOT NULL DEFAULT '1',
  `es_admin` tinyint(1) NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `intentos_fallidos` tinyint unsigned NOT NULL DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `creado_por` int unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_cedula` (`cedula`),
  KEY `ix_usuarios_puesto` (`puesto_id`,`activo`),
  KEY `ix_usuarios_nombre` (`apellido`,`nombre`),
  KEY `fk_usuarios_creador` (`creado_por`),
  CONSTRAINT `fk_usuarios_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_usuarios_puesto` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Login por cédula; password bcrypt';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_bitacora_trabajadores`
--

DROP TABLE IF EXISTS `v_bitacora_trabajadores`;
/*!50001 DROP VIEW IF EXISTS `v_bitacora_trabajadores`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_bitacora_trabajadores` AS SELECT 
 1 AS `registro_id`,
 1 AS `usuario_id`,
 1 AS `trabajador`,
 1 AS `puesto`,
 1 AS `orden_id`,
 1 AS `numero_orden`,
 1 AS `cliente`,
 1 AS `tipo_trabajo`,
 1 AS `nombre_trabajo`,
 1 AS `cantidad`,
 1 AS `etapa`,
 1 AS `marcada_en`,
 1 AS `minutos_en_etapa`,
 1 AS `fecha`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_ordenes_dashboard`
--

DROP TABLE IF EXISTS `v_ordenes_dashboard`;
/*!50001 DROP VIEW IF EXISTS `v_ordenes_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ordenes_dashboard` AS SELECT 
 1 AS `orden_id`,
 1 AS `numero_orden`,
 1 AS `linea_id`,
 1 AS `linea`,
 1 AS `cliente_id`,
 1 AS `cliente_cedula`,
 1 AS `cliente`,
 1 AS `nombre_comercial`,
 1 AS `telefono`,
 1 AS `telefono_wa`,
 1 AS `tipo_trabajo_id`,
 1 AS `tipo_codigo`,
 1 AS `tipo_trabajo`,
 1 AS `nombre_trabajo`,
 1 AS `cantidad`,
 1 AS `archivo_sin_cambios`,
 1 AS `etapa`,
 1 AS `etapa_codigo`,
 1 AS `etapa_icono`,
 1 AS `etapa_color`,
 1 AS `secuencia_actual`,
 1 AS `disenador_id`,
 1 AS `disenador`,
 1 AS `costurera_id`,
 1 AS `costurera`,
 1 AS `costurera_telefono`,
 1 AS `sin_confeccion`,
 1 AS `perfil_impresion`,
 1 AS `vendedor_id`,
 1 AS `vendedor`,
 1 AS `fecha_ingreso`,
 1 AS `fecha_entrega`,
 1 AS `estado`,
 1 AS `urgente`,
 1 AS `motivo_urgencia`,
 1 AS `finalizada`,
 1 AS `ultimo_cambio_etapa`,
 1 AS `dias_restantes`,
 1 AS `por_vencer`,
 1 AS `estancada`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_sellos`
--

DROP TABLE IF EXISTS `v_sellos`;
/*!50001 DROP VIEW IF EXISTS `v_sellos`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_sellos` AS SELECT 
 1 AS `id`,
 1 AS `codigo`,
 1 AS `descripcion`,
 1 AS `cantidad`,
 1 AS `minimo`,
 1 AS `tinta`,
 1 AS `tinta_hex`,
 1 AS `bajo_minimo`,
 1 AS `actualizado_en`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `whatsapp_cola`
--

DROP TABLE IF EXISTS `whatsapp_cola`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_cola` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `orden_id` bigint unsigned DEFAULT NULL,
  `telefono` varchar(20) NOT NULL,
  `plantilla` enum('ORDEN_CREADA','ORDEN_LISTA','OTRO') NOT NULL,
  `mensaje` text NOT NULL,
  `estado` enum('PENDIENTE','ENVIADO','ERROR','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  `intentos` tinyint unsigned NOT NULL DEFAULT '0',
  `error` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enviado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_wa_estado` (`estado`,`creado_en`),
  KEY `ix_wa_orden` (`orden_id`),
  CONSTRAINT `fk_wa_orden` FOREIGN KEY (`orden_id`) REFERENCES `ordenes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Cola de salida; el backend la procesa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'imprenta'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `ev_ordenes_estancadas` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 */ /*!50106 EVENT `ev_ordenes_estancadas` ON SCHEDULE EVERY 1 DAY STARTS '2026-09-09 07:00:00' ON COMPLETION NOT PRESERVE ENABLE DO CALL sp_detectar_estancadas(7) */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'imprenta'
--
/*!50003 DROP FUNCTION IF EXISTS `fn_es_habil` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  FUNCTION `fn_es_habil`(p_fecha DATE) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
  IF DAYOFWEEK(p_fecha) IN (1, 7) THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM feriados WHERE fecha = p_fecha) THEN
    RETURN 0;
  END IF;
  RETURN 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_siguiente_habil` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  FUNCTION `fn_siguiente_habil`(p_fecha DATE) RETURNS date
    READS SQL DATA
BEGIN
  DECLARE v_fecha DATE DEFAULT p_fecha;
  DECLARE v_guarda SMALLINT DEFAULT 0;
  WHILE fn_es_habil(v_fecha) = 0 AND v_guarda < 60 DO
    SET v_fecha = v_fecha + INTERVAL 1 DAY;
    SET v_guarda = v_guarda + 1;
  END WHILE;
  RETURN v_fecha;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_sumar_dias_habiles` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  FUNCTION `fn_sumar_dias_habiles`(p_desde DATE, p_dias INT) RETURNS date
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_avanzar_etapa` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE `sp_avanzar_etapa`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_detectar_estancadas` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE `sp_detectar_estancadas`(IN p_dias INT)
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_mover_papel` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE `sp_mover_papel`(
  IN p_papel_id   TINYINT UNSIGNED,
  IN p_tipo       VARCHAR(10),
  IN p_cantidad   INT,
  IN p_usuario_id INT UNSIGNED,
  IN p_motivo     VARCHAR(150))
BEGIN
  DECLARE v_saldo INT DEFAULT NULL;
  DECLARE v_nuevo INT;

  SELECT resmas INTO v_saldo FROM tipos_papel WHERE id = p_papel_id FOR UPDATE;
  IF v_saldo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El papel no existe';
  END IF;

  SET v_nuevo = CASE p_tipo
                  WHEN 'ENTRADA' THEN v_saldo + ABS(p_cantidad)
                  WHEN 'SALIDA'  THEN v_saldo - ABS(p_cantidad)
                  ELSE p_cantidad
                END;

  IF v_nuevo < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La existencia no puede quedar negativa';
  END IF;

  UPDATE tipos_papel SET resmas = v_nuevo WHERE id = p_papel_id;

  INSERT INTO papeles_movimientos
        (papel_id, tipo, cantidad, saldo_anterior, saldo_nuevo, motivo, usuario_id)
  VALUES (p_papel_id, p_tipo, p_cantidad, v_saldo, v_nuevo, p_motivo, p_usuario_id);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_mover_sello` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE `sp_mover_sello`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_bitacora_trabajadores`
--

/*!50001 DROP VIEW IF EXISTS `v_bitacora_trabajadores`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_bitacora_trabajadores` AS select `le`.`id` AS `registro_id`,`u`.`id` AS `usuario_id`,`u`.`nombre_completo` AS `trabajador`,`p`.`nombre` AS `puesto`,`o`.`id` AS `orden_id`,`o`.`numero_orden` AS `numero_orden`,`c`.`nombre` AS `cliente`,`tt`.`nombre` AS `tipo_trabajo`,`ol`.`nombre_trabajo` AS `nombre_trabajo`,`ol`.`cantidad` AS `cantidad`,`e`.`nombre` AS `etapa`,`le`.`marcada_en` AS `marcada_en`,`le`.`minutos_en_etapa` AS `minutos_en_etapa`,cast(`le`.`marcada_en` as date) AS `fecha` from (((((((`linea_etapas` `le` join `usuarios` `u` on((`u`.`id` = `le`.`usuario_id`))) join `puestos` `p` on((`p`.`id` = `u`.`puesto_id`))) join `orden_lineas` `ol` on((`ol`.`id` = `le`.`linea_id`))) join `ordenes` `o` on((`o`.`id` = `ol`.`orden_id`))) join `clientes` `c` on((`c`.`id` = `o`.`cliente_id`))) join `tipos_trabajo` `tt` on((`tt`.`id` = `ol`.`tipo_trabajo_id`))) join `etapas` `e` on((`e`.`id` = `le`.`etapa_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ordenes_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `v_ordenes_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_ordenes_dashboard` AS select `o`.`id` AS `orden_id`,`o`.`numero_orden` AS `numero_orden`,`ol`.`id` AS `linea_id`,`ol`.`linea` AS `linea`,`c`.`id` AS `cliente_id`,`c`.`cedula` AS `cliente_cedula`,`c`.`nombre` AS `cliente`,`c`.`nombre_comercial` AS `nombre_comercial`,`c`.`telefono` AS `telefono`,coalesce(`c`.`telefono_wa`,`c`.`telefono`) AS `telefono_wa`,`tt`.`id` AS `tipo_trabajo_id`,`tt`.`codigo` AS `tipo_codigo`,`tt`.`nombre` AS `tipo_trabajo`,`ol`.`nombre_trabajo` AS `nombre_trabajo`,`ol`.`cantidad` AS `cantidad`,`ol`.`archivo_sin_cambios` AS `archivo_sin_cambios`,`e`.`nombre` AS `etapa`,`e`.`codigo` AS `etapa_codigo`,`e`.`icono` AS `etapa_icono`,`e`.`color` AS `etapa_color`,`ol`.`secuencia_actual` AS `secuencia_actual`,`ol`.`disenador_id` AS `disenador_id`,`d`.`nombre_completo` AS `disenador`,`dt`.`costurera_id` AS `costurera_id`,`cos`.`nombre` AS `costurera`,`cos`.`telefono` AS `costurera_telefono`,`dt`.`sin_confeccion` AS `sin_confeccion`,`dt`.`perfil_impresion` AS `perfil_impresion`,`o`.`vendedor_id` AS `vendedor_id`,`v`.`nombre_completo` AS `vendedor`,`o`.`fecha_ingreso` AS `fecha_ingreso`,`ol`.`fecha_entrega` AS `fecha_entrega`,`o`.`estado` AS `estado`,`o`.`urgente` AS `urgente`,`o`.`motivo_urgencia` AS `motivo_urgencia`,`ol`.`finalizada` AS `finalizada`,`ol`.`ultimo_cambio_etapa` AS `ultimo_cambio_etapa`,(to_days(`ol`.`fecha_entrega`) - to_days(curdate())) AS `dias_restantes`,((to_days(`ol`.`fecha_entrega`) - to_days(curdate())) <= `tt`.`dias_alerta_previa`) AS `por_vencer`,(`ol`.`ultimo_cambio_etapa` < (now() - interval 7 day)) AS `estancada` from ((((((((`orden_lineas` `ol` join `ordenes` `o` on((`o`.`id` = `ol`.`orden_id`))) join `clientes` `c` on((`c`.`id` = `o`.`cliente_id`))) join `tipos_trabajo` `tt` on((`tt`.`id` = `ol`.`tipo_trabajo_id`))) join `usuarios` `v` on((`v`.`id` = `o`.`vendedor_id`))) left join `etapas` `e` on((`e`.`id` = `ol`.`etapa_actual_id`))) left join `usuarios` `d` on((`d`.`id` = `ol`.`disenador_id`))) left join `detalle_textil` `dt` on((`dt`.`linea_id` = `ol`.`id`))) left join `costureras` `cos` on((`cos`.`id` = `dt`.`costurera_id`))) where (`o`.`estado` <> 'ANULADA') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_sellos`
--

/*!50001 DROP VIEW IF EXISTS `v_sellos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_sellos` AS select `s`.`id` AS `id`,`s`.`codigo` AS `codigo`,`s`.`descripcion` AS `descripcion`,`s`.`cantidad` AS `cantidad`,`s`.`minimo` AS `minimo`,`t`.`nombre` AS `tinta`,`t`.`hex` AS `tinta_hex`,(`s`.`cantidad` <= `s`.`minimo`) AS `bajo_minimo`,`s`.`actualizado_en` AS `actualizado_en` from (`sellos_inventario` `s` join `tintas` `t` on((`t`.`id` = `s`.`tinta_id`))) where (`s`.`activo` = 1) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13  0:32:36
