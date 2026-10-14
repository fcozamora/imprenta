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
-- Dumping data for table `puestos`
--

LOCK TABLES `puestos` WRITE;
/*!40000 ALTER TABLE `puestos` DISABLE KEYS */;
INSERT INTO `puestos` (`id`, `codigo`, `nombre`, `descripcion`, `activo`, `creado_en`) VALUES (1,'ADMIN','Administrador',NULL,1,'2026-09-09 04:31:21'),(2,'GERENTE','Gerente',NULL,1,'2026-09-09 04:31:21'),(3,'ASIS_ADMIN','Asistente Administrativo',NULL,1,'2026-09-09 04:31:21'),(4,'RECEPCION','Recepcionista',NULL,1,'2026-09-09 04:31:21'),(5,'VENDEDOR','Vendedor(a)',NULL,1,'2026-09-09 04:31:21'),(6,'DISENADOR','Diseñador',NULL,1,'2026-09-09 04:31:21'),(7,'NUMERADOR','Numerador',NULL,1,'2026-09-09 04:31:21'),(8,'PRENCISTA','Prencista',NULL,1,'2026-09-09 04:31:21'),(9,'ENCUADERNADOR','Encuadernador',NULL,1,'2026-09-09 04:31:21');
/*!40000 ALTER TABLE `puestos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` (`codigo`, `modulo`, `descripcion`) VALUES ('archivos.subir','ORDENES','Subir muestras del trabajo'),('auditoria.ver','ADMIN','Ver la bitácora del sistema'),('bitacora.ver','REPORTES','Ver la bitácora de trabajo del personal'),('camisetas.atender','CAMISETAS','Atender los pedidos de camisetas'),('camisetas.solicitar','CAMISETAS','Pedir camisetas armadas'),('catalogos.gestionar','ADMIN','Editar catálogos (papeles, telas, materiales...)'),('clientes.contactar','CLIENTES','Ver el teléfono del cliente y escribirle por WhatsApp'),('clientes.gestionar','CLIENTES','Crear y editar clientes'),('confeccion.ver','TALLER','Ver el tablero de confección textil'),('costureras.gestionar','TALLER','Administrar costureras'),('etapas.avanzar','ORDENES','Marcar etapas de producción'),('materiales.atender','MATERIAL','Atender solicitudes de material'),('materiales.solicitar','MATERIAL','Enviar solicitudes de material'),('ordenes.anular','ORDENES','Anular órdenes'),('ordenes.crear','ORDENES','Ingresar órdenes nuevas'),('ordenes.editar','ORDENES','Editar órdenes existentes'),('ordenes.tomar','ORDENES','Tomar una orden como diseñador'),('ordenes.ver_produccion','ORDENES','Ver solo trabajos de imprenta (talonarios, digital, látex, sobres)'),('ordenes.ver_propias','ORDENES','Ver solo las órdenes propias'),('ordenes.ver_todas','ORDENES','Ver todas las órdenes'),('pedidos_externos.gestionar','PEDIDOS_EXTERNOS','Registrar y consultar pedidos a proveedores externos'),('puestos.gestionar','ADMIN','Crear y editar puestos'),('reportes.generar','REPORTES','Generar reportes'),('sellos.gestionar','SELLOS','Ingresar y actualizar cantidades de sellos'),('sellos.ver','SELLOS','Ver el inventario de sellos'),('trali.gestionar','TRALI','Registrar encomiendas enviadas y recibidas'),('usuarios.gestionar','ADMIN','Crear, editar y resetear contraseñas de usuarios');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `puesto_permisos`
--

LOCK TABLES `puesto_permisos` WRITE;
/*!40000 ALTER TABLE `puesto_permisos` DISABLE KEYS */;
INSERT INTO `puesto_permisos` (`puesto_id`, `permiso_codigo`) VALUES (1,'archivos.subir'),(6,'archivos.subir'),(1,'auditoria.ver'),(1,'bitacora.ver'),(2,'bitacora.ver'),(3,'bitacora.ver'),(1,'camisetas.atender'),(2,'camisetas.atender'),(3,'camisetas.atender'),(1,'camisetas.solicitar'),(2,'camisetas.solicitar'),(3,'camisetas.solicitar'),(4,'camisetas.solicitar'),(5,'camisetas.solicitar'),(1,'catalogos.gestionar'),(2,'catalogos.gestionar'),(3,'catalogos.gestionar'),(1,'clientes.contactar'),(2,'clientes.contactar'),(3,'clientes.contactar'),(4,'clientes.contactar'),(5,'clientes.contactar'),(6,'clientes.contactar'),(1,'clientes.gestionar'),(2,'clientes.gestionar'),(3,'clientes.gestionar'),(4,'clientes.gestionar'),(5,'clientes.gestionar'),(1,'confeccion.ver'),(2,'confeccion.ver'),(3,'confeccion.ver'),(4,'confeccion.ver'),(5,'confeccion.ver'),(6,'confeccion.ver'),(1,'costureras.gestionar'),(2,'costureras.gestionar'),(3,'costureras.gestionar'),(4,'costureras.gestionar'),(1,'etapas.avanzar'),(6,'etapas.avanzar'),(7,'etapas.avanzar'),(8,'etapas.avanzar'),(9,'etapas.avanzar'),(1,'materiales.atender'),(2,'materiales.atender'),(3,'materiales.atender'),(1,'materiales.solicitar'),(6,'materiales.solicitar'),(7,'materiales.solicitar'),(8,'materiales.solicitar'),(9,'materiales.solicitar'),(1,'ordenes.anular'),(2,'ordenes.anular'),(1,'ordenes.crear'),(2,'ordenes.crear'),(3,'ordenes.crear'),(4,'ordenes.crear'),(5,'ordenes.crear'),(1,'ordenes.editar'),(2,'ordenes.editar'),(3,'ordenes.editar'),(4,'ordenes.editar'),(5,'ordenes.editar'),(1,'ordenes.tomar'),(6,'ordenes.tomar'),(7,'ordenes.ver_produccion'),(8,'ordenes.ver_produccion'),(9,'ordenes.ver_produccion'),(1,'ordenes.ver_propias'),(1,'ordenes.ver_todas'),(2,'ordenes.ver_todas'),(3,'ordenes.ver_todas'),(4,'ordenes.ver_todas'),(5,'ordenes.ver_todas'),(6,'ordenes.ver_todas'),(1,'pedidos_externos.gestionar'),(2,'pedidos_externos.gestionar'),(4,'pedidos_externos.gestionar'),(5,'pedidos_externos.gestionar'),(6,'pedidos_externos.gestionar'),(1,'puestos.gestionar'),(2,'puestos.gestionar'),(3,'puestos.gestionar'),(1,'reportes.generar'),(2,'reportes.generar'),(3,'reportes.generar'),(1,'sellos.gestionar'),(6,'sellos.gestionar'),(1,'sellos.ver'),(2,'sellos.ver'),(3,'sellos.ver'),(4,'sellos.ver'),(5,'sellos.ver'),(6,'sellos.ver'),(1,'trali.gestionar'),(2,'trali.gestionar'),(3,'trali.gestionar'),(4,'trali.gestionar'),(5,'trali.gestionar'),(1,'usuarios.gestionar'),(2,'usuarios.gestionar'),(3,'usuarios.gestionar');
/*!40000 ALTER TABLE `puesto_permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` (`id`, `cedula`, `nombre`, `apellido`, `puesto_id`, `password_hash`, `requiere_cambio_password`, `es_admin`, `activo`, `telefono`, `email`, `ultimo_acceso`, `intentos_fallidos`, `bloqueado_hasta`, `creado_por`, `creado_en`, `actualizado_en`) VALUES (1,'000000000','Administrador','del Sistema',1,'$2b$12$fN6X7Zd32RKsYftz/Zw3OeiNnv/3qbBh0VbxBftUkRvBSmjWv8sTi',0,1,1,NULL,NULL,'2026-10-12 23:53:53',0,NULL,NULL,'2026-09-09 04:31:21','2026-10-13 05:53:53');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `etapas`
--

LOCK TABLES `etapas` WRITE;
/*!40000 ALTER TABLE `etapas` DISABLE KEYS */;
INSERT INTO `etapas` (`id`, `codigo`, `nombre`, `icono`, `color`, `puesto_responsable_id`) VALUES (1,'DISENO','Diseño','PenTool','#6366f1',6),(2,'MUESTRA_ENVIADA','Muestra Enviada','Send','#0ea5e9',6),(3,'APROBADO','Aprobado','CircleCheck','#22c55e',6),(4,'MONTAJE','Montaje','Layers','#a855f7',6),(5,'IMPRESION','Impresión','Printer','#f59e0b',8),(6,'SUBLIMACION','Sublimación','Flame','#ef4444',8),(7,'NUMERACION','Numeración','Hash','#14b8a6',7),(8,'COLECCION','Colección','Copy','#8b5cf6',9),(9,'CONFECCION','Confección','Scissors','#ec4899',9),(10,'TALLER','Taller','Wrench','#78716c',9),(11,'FINALIZADO','Finalizado','PackageCheck','#16a34a',NULL),(12,'ENTREGADO','Entregado','Truck','#0f766e',NULL);
/*!40000 ALTER TABLE `etapas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `flujo_etapas`
--

LOCK TABLES `flujo_etapas` WRITE;
/*!40000 ALTER TABLE `flujo_etapas` DISABLE KEYS */;
INSERT INTO `flujo_etapas` (`tipo_trabajo_id`, `secuencia`, `etapa_id`, `omitir_sin_cambios`) VALUES (1,1,1,0),(1,2,2,1),(1,3,3,1),(1,4,5,0),(1,5,7,0),(1,6,8,0),(1,7,11,0),(1,8,12,0),(2,1,1,0),(2,2,2,1),(2,3,4,0),(2,4,5,0),(2,5,6,0),(2,6,9,0),(2,7,11,0),(2,8,12,0),(3,1,1,0),(3,2,2,1),(3,3,3,1),(3,4,5,0),(3,5,10,0),(3,6,11,0),(3,7,12,0),(4,1,1,0),(4,2,2,1),(4,3,3,1),(4,4,5,0),(4,5,10,0),(4,6,11,0),(4,7,12,0),(5,1,1,0),(5,2,2,1),(5,3,3,1),(5,4,5,0),(5,5,11,0),(5,6,12,0),(6,1,1,0),(6,2,2,1),(6,3,5,0),(6,4,9,0),(6,5,11,0),(6,6,12,0),(7,1,1,0),(7,2,2,1),(7,3,9,0),(7,4,11,0),(7,5,12,0),(8,1,1,0),(8,2,2,1),(8,3,3,1),(8,4,5,0),(8,5,11,0),(8,6,12,0);
/*!40000 ALTER TABLE `flujo_etapas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_trabajo`
--

LOCK TABLES `tipos_trabajo` WRITE;
/*!40000 ALTER TABLE `tipos_trabajo` DISABLE KEYS */;
INSERT INTO `tipos_trabajo` (`id`, `codigo`, `nombre`, `dias_habiles_entrega`, `dias_alerta_previa`, `requiere_imagen`, `orden_visual`, `activo`) VALUES (1,'TALONARIOS','Talonarios',7,2,1,1,1),(2,'TEXTIL','Textil',22,5,1,2,1),(3,'IMPRESION_DIGITAL','Impresión Digital',7,2,1,3,1),(4,'HP_LATEX','HP Latex',7,2,1,4,1),(5,'SELLOS','Sellos',7,2,1,5,1),(6,'DTF','DTF',15,4,1,6,1),(7,'BORDADO','Bordado',15,4,1,7,1),(8,'SOBRES','Sobres',7,2,1,8,1);
/*!40000 ALTER TABLE `tipos_trabajo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `feriados`
--

LOCK TABLES `feriados` WRITE;
/*!40000 ALTER TABLE `feriados` DISABLE KEYS */;
INSERT INTO `feriados` (`fecha`, `descripcion`) VALUES ('2026-01-01','Año Nuevo'),('2026-04-02','Jueves Santo'),('2026-04-03','Viernes Santo'),('2026-04-13','Juan Santamaría (trasladado)'),('2026-05-01','Día del Trabajador'),('2026-07-27','Anexión de Guanacaste (trasladado)'),('2026-08-03','Virgen de los Ángeles (trasladado)'),('2026-08-17','Día de la Madre (trasladado)'),('2026-08-31','Día de la Persona Negra'),('2026-09-15','Independencia'),('2026-12-01','Abolición del Ejército'),('2026-12-25','Navidad'),('2027-01-01','Año Nuevo'),('2027-03-25','Jueves Santo'),('2027-03-26','Viernes Santo'),('2027-04-12','Juan Santamaría (trasladado)'),('2027-05-01','Día del Trabajador'),('2027-07-26','Anexión de Guanacaste (trasladado)'),('2027-08-02','Virgen de los Ángeles'),('2027-08-16','Día de la Madre (trasladado)'),('2027-08-30','Día de la Persona Negra (trasladado)'),('2027-09-15','Independencia'),('2027-12-01','Abolición del Ejército'),('2027-12-25','Navidad');
/*!40000 ALTER TABLE `feriados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `secuencias`
--

LOCK TABLES `secuencias` WRITE;
/*!40000 ALTER TABLE `secuencias` DISABLE KEYS */;
INSERT INTO `secuencias` (`nombre`, `valor`) VALUES ('orden',1011);
/*!40000 ALTER TABLE `secuencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_papel`
--

LOCK TABLES `tipos_papel` WRITE;
/*!40000 ALTER TABLE `tipos_papel` DISABLE KEYS */;
INSERT INTO `tipos_papel` (`id`, `nombre`, `categoria`, `activo`, `es_original`, `resmas`, `minimo`, `actualizado_en`) VALUES (1,'Bond','BOND',1,0,0,0,'2026-10-07 04:33:26'),(2,'Bond Verde','BOND',1,0,0,0,'2026-10-07 04:33:26'),(3,'Bond Celeste','BOND',1,0,0,0,'2026-10-07 04:33:26'),(4,'Bond Amarillo','BOND',1,0,0,0,'2026-10-07 04:33:26'),(5,'Bristol','BRISTOL',1,0,0,0,'2026-10-07 04:33:26'),(6,'Bristol Celeste','BRISTOL',1,0,0,0,'2026-10-07 04:33:26'),(7,'Bristol Amarillo','BRISTOL',1,0,0,0,'2026-10-07 04:33:26'),(8,'Bristol Verde','BRISTOL',1,0,0,0,'2026-10-07 04:33:26'),(9,'C12','ESPECIAL',1,0,0,0,'2026-10-07 04:33:26'),(10,'Antigrasa','ESPECIAL',1,0,0,0,'2026-10-07 04:33:26'),(11,'Químico Amarillo','QUIMICO',1,0,0,5,'2026-10-13 06:41:55'),(12,'Químico Celeste','QUIMICO',1,0,0,0,'2026-10-07 04:33:26'),(13,'Químico Verde','QUIMICO',1,0,0,0,'2026-10-07 04:33:26'),(14,'Químico Rosado','QUIMICO',1,0,0,0,'2026-10-07 04:33:26'),(15,'Químico Blanco','QUIMICO',1,1,0,0,'2026-10-07 04:33:26'),(32,'Químico Celeste Oscuro','QUIMICO',1,0,0,0,'2026-10-07 04:33:26');
/*!40000 ALTER TABLE `tipos_papel` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_copia`
--

LOCK TABLES `tipos_copia` WRITE;
/*!40000 ALTER TABLE `tipos_copia` DISABLE KEYS */;
INSERT INTO `tipos_copia` (`id`, `nombre`, `cantidad_hojas`, `activo`) VALUES (1,'Sencillo',1,1),(2,'Duplicado',2,1),(3,'Triplicado',3,1),(4,'Cuadruplicado',4,1);
/*!40000 ALTER TABLE `tipos_copia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_sobre`
--

LOCK TABLES `tipos_sobre` WRITE;
/*!40000 ALTER TABLE `tipos_sobre` DISABLE KEYS */;
INSERT INTO `tipos_sobre` (`id`, `nombre`, `activo`) VALUES (1,'Por definir',1);
/*!40000 ALTER TABLE `tipos_sobre` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tamanos_talonario`
--

LOCK TABLES `tamanos_talonario` WRITE;
/*!40000 ALTER TABLE `tamanos_talonario` DISABLE KEYS */;
INSERT INTO `tamanos_talonario` (`id`, `nombre`, `orden_visual`, `activo`) VALUES (1,'1/6',1,1),(2,'1/8',2,1),(3,'1/12',3,1),(4,'1/16',4,1),(5,'1/24',5,1),(6,'1/32',6,1),(7,'1/48',7,1);
/*!40000 ALTER TABLE `tamanos_talonario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `telas`
--

LOCK TABLES `telas` WRITE;
/*!40000 ALTER TABLE `telas` DISABLE KEYS */;
INSERT INTO `telas` (`id`, `nombre`, `activo`) VALUES (1,'SpeedDry',1),(2,'Capriatti',1),(3,'Madrid',1),(4,'Tropical',1),(5,'Tecnogold',1),(6,'Columbia',1),(7,'Columbia Stretch',1),(8,'Garota',1),(9,'Microspandex',1),(10,'Cinta Graduación',1),(11,'Lanyard',1);
/*!40000 ALTER TABLE `telas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tintas`
--

LOCK TABLES `tintas` WRITE;
/*!40000 ALTER TABLE `tintas` DISABLE KEYS */;
INSERT INTO `tintas` (`id`, `nombre`, `hex`, `activo`) VALUES (1,'Negro','#111827',1),(2,'Azul','#1d4ed8',1),(3,'Rojo','#dc2626',1),(4,'Verde','#16a34a',1),(5,'Morado','#7c3aed',1),(6,'Café','#78350f',1),(7,'Naranja','#ea580c',1),(8,'Full Color','#64748b',1);
/*!40000 ALTER TABLE `tintas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `materiales_latex`
--

LOCK TABLES `materiales_latex` WRITE;
/*!40000 ALTER TABLE `materiales_latex` DISABLE KEYS */;
INSERT INTO `materiales_latex` (`id`, `nombre`, `categoria`, `activo`) VALUES (1,'Adhesivo Brillante','LATEX',1),(2,'Adhesivo Mate','LATEX',1),(3,'Adhesivo Blackout','LATEX',1),(4,'Lona','LATEX',1),(5,'Canva','LATEX',1),(6,'Termoimprimible','LATEX',1),(7,'Otros Adhesivo','LATEX',1);
/*!40000 ALTER TABLE `materiales_latex` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tallas_camiseta`
--

LOCK TABLES `tallas_camiseta` WRITE;
/*!40000 ALTER TABLE `tallas_camiseta` DISABLE KEYS */;
INSERT INTO `tallas_camiseta` (`id`, `genero`, `nombre`, `orden_visual`, `activo`) VALUES (1,'MUJER','S/12',1,1),(2,'MUJER','M/14',2,1),(3,'MUJER','L/16',3,1),(4,'MUJER','XL/18',4,1),(5,'MUJER','XXL',5,1),(6,'HOMBRE','S',1,1),(7,'HOMBRE','M',2,1),(8,'HOMBRE','L',3,1),(9,'HOMBRE','XL',4,1),(10,'HOMBRE','2XL',5,1),(11,'HOMBRE','4XL',6,1);
/*!40000 ALTER TABLE `tallas_camiseta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `costureras`
--

LOCK TABLES `costureras` WRITE;
/*!40000 ALTER TABLE `costureras` DISABLE KEYS */;
/*!40000 ALTER TABLE `costureras` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13  0:42:34

-- Catalogo de materiales de impresion
INSERT INTO `permisos` (`codigo`, `modulo`, `descripcion`)
VALUES ('materiales.catalogo', 'TALLER',
        'Mantener el catalogo de materiales de HP Latex e Impresion Digital');

INSERT INTO `puesto_permisos` (`puesto_id`, `permiso_codigo`)
SELECT p.id, 'materiales.catalogo'
FROM puestos p
WHERE p.nombre IN ('Administrador', 'Gerente', 'Diseñador');
