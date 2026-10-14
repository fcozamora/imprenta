-- =====================================================================
--  Materiales separados: HP Latex e Impresion Digital
--  No borra ni mueve nada. Los materiales que ya existen quedan en LATEX,
--  que es donde estaban, y las ordenes viejas siguen apuntando al suyo.
-- =====================================================================

ALTER TABLE materiales_latex
  ADD COLUMN categoria ENUM('LATEX','DIGITAL') NOT NULL DEFAULT 'LATEX' AFTER nombre,
  DROP INDEX uq_matlatex_nombre,
  ADD UNIQUE KEY uq_matlatex_cat_nombre (categoria, nombre);

-- Permiso para mantener el catalogo desde la aplicacion.
INSERT INTO permisos (codigo, modulo, descripcion)
VALUES ('materiales.catalogo', 'TALLER',
        'Mantener el catalogo de materiales de HP Latex e Impresion Digital');

INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT p.id, 'materiales.catalogo'
FROM puestos p
WHERE p.nombre IN ('Administrador', 'Gerente', 'Diseñador');
