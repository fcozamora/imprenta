-- =====================================================================
--  El prencista entra a Papeles y registra entradas y salidas,
--  pero no edita el catalogo.
--
--  Hasta ahora las dos cosas iban juntas en catalogos.gestionar, que
--  ademas abre los demas catalogos. Se separa el movimiento de
--  existencias en su propio permiso.
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT 'papeles.movimientos', 'MATERIAL',
       'Ver los papeles y registrar entradas, salidas y ajustes de resmas'
 WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = 'papeles.movimientos');

-- Quien ya podia mover existencias lo sigue pudiendo, mas el prencista.
INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'papeles.movimientos'
FROM puestos p
WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo', 'Prencista')
  AND NOT EXISTS (
    SELECT 1 FROM puesto_permisos pp
     WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'papeles.movimientos'
  );

-- Comprobacion
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'papeles.movimientos'
 ORDER BY p.id;
