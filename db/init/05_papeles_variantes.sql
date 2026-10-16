-- =====================================================================
--  Papeles: administracion propia y existencia separada por variante
--
--  1. Permiso papeles.gestionar
--     Agregar, renombrar y desactivar papeles estaba detras de
--     catalogos.gestionar, que ademas abre telas, materiales y los
--     demas catalogos. Se separa para que quien maneja la bodega de
--     papel pueda administrar la lista sin tocar lo demas.
--
--  2. Variantes intermedio / final
--     Cada color de quimico pasa a tener dos renglones de bodega,
--     "Quimico Rosado Intermedio" y "Quimico Rosado Final", que son
--     los que llevan las resmas. El color sigue siendo un renglon
--     aparte y es el unico que se ofrece al crear la orden, asi que
--     ahi se sigue escogiendo "Quimico Rosado" sin distinguir.
--     Solo llevan variantes Rosado, Amarillo, Celeste y Verde.
--
--  3. Quimico Blanco queda como el unico original de los talonarios.
--  4. Quimico Celeste Oscuro se elimina (no existe en la imprenta).
--
--  Se puede ejecutar mas de una vez sin duplicar nada.
-- =====================================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------------ 1
--  Permiso para administrar el catalogo de papeles

INSERT INTO permisos (codigo, modulo, descripcion)
SELECT 'papeles.gestionar', 'MATERIAL',
       'Agregar, renombrar y desactivar papeles del inventario'
 WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE codigo = 'papeles.gestionar');

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'papeles.gestionar'
  FROM puestos p
 WHERE p.nombre IN ('Administrador', 'Gerente', 'Asistente Administrativo', 'Prencista')
   AND NOT EXISTS (
     SELECT 1 FROM puesto_permisos pp
      WHERE pp.puesto_id = p.id AND pp.permiso_codigo = 'papeles.gestionar'
   );

-- ------------------------------------------------------------------ 2
--  Columnas de la variante

SET @n := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tipos_papel' AND COLUMN_NAME = 'padre_id');
SET @s := IF(@n = 0,
  'ALTER TABLE tipos_papel ADD COLUMN padre_id TINYINT UNSIGNED NULL AFTER categoria',
  'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @n := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tipos_papel' AND COLUMN_NAME = 'variante');
SET @s := IF(@n = 0,
  'ALTER TABLE tipos_papel ADD COLUMN variante ENUM(''INTERMEDIO'',''FINAL'') NULL AFTER padre_id',
  'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @n := (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tipos_papel' AND INDEX_NAME = 'uq_papel_variante');
SET @s := IF(@n = 0,
  'ALTER TABLE tipos_papel ADD UNIQUE KEY uq_papel_variante (padre_id, variante)',
  'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @n := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tipos_papel' AND CONSTRAINT_NAME = 'fk_papel_padre');
SET @s := IF(@n = 0,
  'ALTER TABLE tipos_papel ADD CONSTRAINT fk_papel_padre FOREIGN KEY (padre_id) REFERENCES tipos_papel (id) ON DELETE CASCADE',
  'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- ------------------------------------------------------------------ 3
--  Los cuatro colores que llevan intermedio y final

INSERT INTO tipos_papel (nombre, categoria, padre_id, variante, activo, es_original, resmas, minimo)
SELECT CONCAT(p.nombre, ' Intermedio'), 'QUIMICO', p.id, 'INTERMEDIO', p.activo, 0, 0, p.minimo
  FROM tipos_papel p
  LEFT JOIN tipos_papel h ON h.padre_id = p.id AND h.variante = 'INTERMEDIO'
 WHERE p.nombre IN ('Químico Rosado', 'Químico Amarillo', 'Químico Celeste', 'Químico Verde')
   AND p.padre_id IS NULL
   AND h.id IS NULL;

INSERT INTO tipos_papel (nombre, categoria, padre_id, variante, activo, es_original, resmas, minimo)
SELECT CONCAT(p.nombre, ' Final'), 'QUIMICO', p.id, 'FINAL', p.activo, 0, 0, p.minimo
  FROM tipos_papel p
  LEFT JOIN tipos_papel h ON h.padre_id = p.id AND h.variante = 'FINAL'
 WHERE p.nombre IN ('Químico Rosado', 'Químico Amarillo', 'Químico Celeste', 'Químico Verde')
   AND p.padre_id IS NULL
   AND h.id IS NULL;

-- ------------------------------------------------------------------ 4
--  Traslado de la existencia que ya estaba anotada en el color.
--  Pasa a la variante Final, que es la de los talonarios de dos hojas.
--  Revise los dos numeros y corrijalos con un ajuste por conteo fisico.
--  @ya evita que el traslado se repita si el archivo se corre de nuevo.

SET @motivo := 'Traslado de existencia al separar intermedio y final';
SET @ya := (SELECT COUNT(*) FROM papeles_movimientos WHERE motivo = @motivo);
SET @quien := COALESCE(
  (SELECT MIN(id) FROM usuarios WHERE es_admin = 1),
  (SELECT MIN(id) FROM usuarios)
);

INSERT INTO papeles_movimientos
      (papel_id, tipo, cantidad, saldo_anterior, saldo_nuevo, motivo, usuario_id)
SELECT v.id, 'AJUSTE', p.resmas, 0, p.resmas, @motivo, @quien
  FROM tipos_papel v
  JOIN tipos_papel p ON p.id = v.padre_id
 WHERE v.variante = 'FINAL' AND p.resmas > 0 AND @ya = 0;

UPDATE tipos_papel v
  JOIN tipos_papel p ON p.id = v.padre_id
   SET v.resmas = p.resmas
 WHERE v.variante = 'FINAL' AND p.resmas > 0 AND @ya = 0;

-- El color ya no lleva resmas propias: su existencia es la suma de las variantes.
UPDATE tipos_papel p
  JOIN tipos_papel v ON v.padre_id = p.id
   SET p.resmas = 0, p.minimo = 0
 WHERE @ya = 0;

-- ------------------------------------------------------------------ 5
--  El original y el color que no existe

-- Una variante nunca es el original del talonario.
UPDATE tipos_papel SET es_original = 0 WHERE padre_id IS NOT NULL;

-- Si por alguna razon quedo sin original, vuelve a ser el Blanco.
SET @sin := (SELECT COUNT(*) FROM tipos_papel WHERE es_original = 1);
UPDATE tipos_papel SET es_original = 1
 WHERE nombre = 'Químico Blanco' AND @sin = 0;

-- Celeste Oscuro se borra; si alguna orden vieja lo usa, solo se desactiva.
DELETE t FROM tipos_papel t
  LEFT JOIN talonario_copias tc ON tc.papel_id = t.id
 WHERE t.nombre = 'Químico Celeste Oscuro' AND tc.papel_id IS NULL;

UPDATE tipos_papel SET activo = 0 WHERE nombre = 'Químico Celeste Oscuro';

-- ------------------------------------------------------------------ 6
--  Comprobacion

SELECT 'Papeles' AS revision;
SELECT COALESCE(pa.nombre, p.nombre) AS color,
       COALESCE(p.variante, '—')     AS variante,
       p.resmas, p.minimo, p.activo,
       IF(p.es_original = 1, 'original', '') AS marca
  FROM tipos_papel p
  LEFT JOIN tipos_papel pa ON pa.id = p.padre_id
 WHERE COALESCE(pa.categoria, p.categoria) = 'QUIMICO'
 ORDER BY COALESCE(pa.nombre, p.nombre), p.padre_id IS NOT NULL,
          FIELD(p.variante, 'INTERMEDIO', 'FINAL');

SELECT 'Quienes administran papeles' AS revision;
SELECT p.nombre AS puesto
  FROM puesto_permisos pp
  JOIN puestos p ON p.id = pp.puesto_id
 WHERE pp.permiso_codigo = 'papeles.gestionar'
 ORDER BY p.id;
