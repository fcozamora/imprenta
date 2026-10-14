-- =====================================================================
--  Recepcion y ventas pueden avanzar etapas
--  A veces necesitan mover un trabajo sin esperar al area de produccion.
--  Solo agrega el permiso: la aplicacion no tiene otra restriccion detras.
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'etapas.avanzar'
FROM puestos p
WHERE p.nombre IN ('Recepcionista', 'Vendedor(a)')
  AND NOT EXISTS (
    SELECT 1 FROM puesto_permisos pp
     WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'etapas.avanzar'
  );

-- Comprobacion: deben aparecer Administrador, Disenador, Numerador,
-- Prencista, Encuadernador, Recepcionista y Vendedor(a).
SELECT p.nombre AS puesto
FROM puesto_permisos pp
JOIN puestos p ON p.id = pp.puesto_id
WHERE pp.permiso_codigo = 'etapas.avanzar'
ORDER BY p.id;
