-- =====================================================================
--  La muestra se adjunta desde Nueva orden
--
--  Subir la foto del trabajo estaba solo en Administrador y Diseñador.
--  Para dejar de imprimir en papel las muestras de los trabajos de
--  archivo, quien recibe la orden tiene que poder adjuntarla ahi mismo.
--
--  Se agrega archivos.subir a Gerente, Asistente Administrativo,
--  Recepcionista y Vendedor(a).
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'archivos.subir'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo',
                    'Recepcionista', 'Vendedor(a)', 'Diseñador')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'archivos.subir'
   );

-- Comprobacion
SELECT 'Quienes adjuntan muestras' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'archivos.subir'
 ORDER BY p.id;

SELECT 'Quienes ven el precio en la hoja impresa' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'ordenes.ver_precio'
 ORDER BY p.id;
