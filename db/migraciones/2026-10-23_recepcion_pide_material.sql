-- =====================================================================
--  Recepcion tambien pide material
--
--  materiales.solicitar lo tenian Administrador, Diseñador, Numerador,
--  Prencista y Encuadernador: los de produccion. Recepcion tambien
--  necesita pedir lo suyo.
--
--  Atender las solicitudes sigue igual, en materiales.atender, que no
--  se toca: recepcion pide, no aprueba lo que piden los demas.
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'materiales.solicitar'
  FROM puestos p
 WHERE p.nombre = 'Recepcionista'
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'materiales.solicitar'
   );

-- Comprobacion
SELECT 'Quienes piden material' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'materiales.solicitar'
 ORDER BY p.id;

SELECT 'Quienes las atienden' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'materiales.atender'
 ORDER BY p.id;
