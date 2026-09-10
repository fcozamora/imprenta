-- =====================================================================
--  IMPRENTA · 02_catalogos.sql — Datos iniciales
-- =====================================================================
SET NAMES utf8mb4;

-- ---------------------------------------------------------------- Puestos
INSERT INTO puestos (id, codigo, nombre) VALUES
  (1,'ADMIN',        'Administrador'),
  (2,'GERENTE',      'Gerente'),
  (3,'ASIS_ADMIN',   'Asistente Administrativo'),
  (4,'RECEPCION',    'Recepcionista'),
  (5,'VENDEDOR',     'Vendedor(a)'),
  (6,'DISENADOR',    'Diseñador'),
  (7,'NUMERADOR',    'Numerador'),
  (8,'PRENCISTA',    'Prencista'),
  (9,'ENCUADERNADOR','Encuadernador');

-- ---------------------------------------------------------------- Permisos
INSERT INTO permisos (codigo, modulo, descripcion) VALUES
  ('usuarios.gestionar',   'ADMIN',    'Crear, editar y resetear contraseñas de usuarios'),
  ('puestos.gestionar',    'ADMIN',    'Crear y editar puestos'),
  ('catalogos.gestionar',  'ADMIN',    'Editar catálogos (papeles, telas, materiales...)'),
  ('auditoria.ver',        'ADMIN',    'Ver la bitácora del sistema'),
  ('ordenes.ver_todas',    'ORDENES',  'Ver todas las órdenes'),
  ('ordenes.ver_propias',  'ORDENES',  'Ver solo las órdenes propias'),
  ('ordenes.crear',        'ORDENES',  'Ingresar órdenes nuevas'),
  ('ordenes.editar',       'ORDENES',  'Editar órdenes existentes'),
  ('ordenes.anular',       'ORDENES',  'Anular órdenes'),
  ('ordenes.tomar',        'ORDENES',  'Tomar una orden como diseñador'),
  ('etapas.avanzar',       'ORDENES',  'Marcar etapas de producción'),
  ('archivos.subir',       'ORDENES',  'Subir muestras del trabajo'),
  ('clientes.gestionar',   'CLIENTES', 'Crear y editar clientes'),
  ('sellos.ver',           'SELLOS',   'Ver el inventario de sellos'),
  ('sellos.gestionar',     'SELLOS',   'Ingresar y actualizar cantidades de sellos'),
  ('materiales.solicitar', 'MATERIAL', 'Enviar solicitudes de material'),
  ('materiales.atender',   'MATERIAL', 'Atender solicitudes de material'),
  ('costureras.gestionar', 'TALLER',   'Administrar costureras'),
  ('bitacora.ver',         'REPORTES', 'Ver la bitácora de trabajo del personal'),
  ('reportes.generar',     'REPORTES', 'Generar reportes');

-- Asignación de permisos por puesto
INSERT INTO puesto_permisos (puesto_id, permiso_codigo)
SELECT 1, codigo FROM permisos;                       -- Administrador: todo

INSERT INTO puesto_permisos (puesto_id, permiso_codigo) VALUES
  -- Gerente y Asistente Administrativo
  (2,'ordenes.ver_todas'),(2,'ordenes.crear'),(2,'ordenes.editar'),(2,'ordenes.anular'),
  (2,'clientes.gestionar'),(2,'costureras.gestionar'),(2,'bitacora.ver'),(2,'reportes.generar'),
  (2,'usuarios.gestionar'),(2,'puestos.gestionar'),(2,'sellos.ver'),(2,'materiales.atender'),
  (3,'ordenes.ver_todas'),(3,'ordenes.crear'),(3,'ordenes.editar'),
  (3,'clientes.gestionar'),(3,'costureras.gestionar'),(3,'bitacora.ver'),(3,'reportes.generar'),
  (3,'usuarios.gestionar'),(3,'puestos.gestionar'),(3,'sellos.ver'),(3,'materiales.atender'),
  -- Recepcionista y Vendedor
  (4,'ordenes.ver_todas'),(4,'ordenes.crear'),(4,'clientes.gestionar'),(4,'sellos.ver'),
  (5,'ordenes.ver_todas'),(5,'ordenes.crear'),(5,'clientes.gestionar'),(5,'sellos.ver'),
  -- Diseñador
  (6,'ordenes.ver_todas'),(6,'ordenes.tomar'),(6,'etapas.avanzar'),(6,'archivos.subir'),
  (6,'sellos.ver'),(6,'sellos.gestionar'),(6,'materiales.solicitar'),
  -- Numerador / Prencista / Encuadernador
  (7,'ordenes.ver_todas'),(7,'etapas.avanzar'),(7,'materiales.solicitar'),
  (8,'ordenes.ver_todas'),(8,'etapas.avanzar'),(8,'materiales.solicitar'),
  (9,'ordenes.ver_todas'),(9,'etapas.avanzar'),(9,'materiales.solicitar');

-- ---------------------------------------------------------------- Usuario admin
-- Cédula: 000000000   ·   Contraseña inicial: impreSC01
INSERT INTO usuarios (id, cedula, nombre, apellido, puesto_id, password_hash, requiere_cambio_password, es_admin)
VALUES (1,'000000000','Administrador','del Sistema',1,
        '$2b$12$fN6X7Zd32RKsYftz/Zw3OeiNnv/3qbBh0VbxBftUkRvBSmjWv8sTi',1,1);

-- ---------------------------------------------------------------- Etapas
INSERT INTO etapas (id, codigo, nombre, icono, color, puesto_responsable_id) VALUES
  ( 1,'DISENO',          'Diseño',         'PenTool',      '#6366f1', 6),
  ( 2,'MUESTRA_ENVIADA', 'Muestra Enviada','Send',         '#0ea5e9', 6),
  ( 3,'APROBADO',        'Aprobado',       'CircleCheck',  '#22c55e', 6),
  ( 4,'MONTAJE',         'Montaje',        'Layers',       '#a855f7', 6),
  ( 5,'IMPRESION',       'Impresión',      'Printer',      '#f59e0b', 8),
  ( 6,'SUBLIMACION',     'Sublimación',    'Flame',        '#ef4444', 8),
  ( 7,'NUMERACION',      'Numeración',     'Hash',         '#14b8a6', 7),
  ( 8,'COLECCION',       'Colección',      'Copy',         '#8b5cf6', 9),
  ( 9,'CONFECCION',      'Confección',     'Scissors',     '#ec4899', 9),
  (10,'TALLER',          'Taller',         'Wrench',       '#78716c', 9),
  (11,'FINALIZADO',      'Finalizado',     'PackageCheck', '#16a34a', NULL),
  (12,'ENTREGADO',       'Entregado',      'Truck',        '#0f766e', NULL);

-- ---------------------------------------------------------------- Tipos de trabajo
INSERT INTO tipos_trabajo (id, codigo, nombre, dias_habiles_entrega, dias_alerta_previa, requiere_imagen, orden_visual) VALUES
  (1,'TALONARIOS',        'Talonarios',         7, 2, 1, 1),
  (2,'TEXTIL',            'Textil',            22, 5, 1, 2),
  (3,'IMPRESION_DIGITAL', 'Impresión Digital',  7, 2, 1, 3),
  (4,'HP_LATEX',          'HP Latex',           7, 2, 1, 4),
  (5,'SELLOS',            'Sellos',             7, 2, 1, 5),
  (6,'DTF',               'DTF',               15, 4, 1, 6),
  (7,'BORDADO',           'Bordado',           15, 4, 1, 7),
  (8,'SOBRES',            'Sobres',             7, 2, 1, 8);

-- ---------------------------------------------------------------- Flujos de etapas
-- (tipo, secuencia, etapa, omitir cuando "Archivo sin cambios")
INSERT INTO flujo_etapas (tipo_trabajo_id, secuencia, etapa_id, omitir_sin_cambios) VALUES
  -- 1 Talonarios: Diseño, Muestra, Aprobado, Impresión, Numeración, Colección, Finalizado, Entregado
  (1,1, 1,0),(1,2, 2,1),(1,3, 3,1),(1,4, 5,0),(1,5, 7,0),(1,6, 8,0),(1,7,11,0),(1,8,12,0),
  -- 2 Textil: Diseño, Muestra, Montaje, Impresión, Sublimación, Confección, Finalizado, Entregado
  (2,1, 1,0),(2,2, 2,1),(2,3, 4,0),(2,4, 5,0),(2,5, 6,0),(2,6, 9,0),(2,7,11,0),(2,8,12,0),
  -- 3 Impresión Digital: Diseño, Muestra, Aprobado, Impresión, Taller, Finalizado, Entregado
  (3,1, 1,0),(3,2, 2,1),(3,3, 3,1),(3,4, 5,0),(3,5,10,0),(3,6,11,0),(3,7,12,0),
  -- 4 HP Latex: igual que Impresión Digital
  (4,1, 1,0),(4,2, 2,1),(4,3, 3,1),(4,4, 5,0),(4,5,10,0),(4,6,11,0),(4,7,12,0),
  -- 5 Sellos: Diseño, Muestra, Aprobado, Impresión, Finalizado, Entregado
  (5,1, 1,0),(5,2, 2,1),(5,3, 3,1),(5,4, 5,0),(5,5,11,0),(5,6,12,0),
  -- 6 DTF: Diseño, Muestra, Impresión, Confección, Finalizado, Entregado
  (6,1, 1,0),(6,2, 2,1),(6,3, 5,0),(6,4, 9,0),(6,5,11,0),(6,6,12,0),
  -- 7 Bordado: Diseño, Muestra, Confección, Finalizado, Entregado
  (7,1, 1,0),(7,2, 2,1),(7,3, 9,0),(7,4,11,0),(7,5,12,0),
  -- 8 Sobres (supuesto: igual a Sellos; ajústalo si el flujo real es otro)
  (8,1, 1,0),(8,2, 2,1),(8,3, 3,1),(8,4, 5,0),(8,5,11,0),(8,6,12,0);

-- ---------------------------------------------------------------- Tintas
INSERT INTO tintas (nombre, hex) VALUES
  ('Negro','#111827'),('Azul','#1d4ed8'),('Rojo','#dc2626'),('Verde','#16a34a'),
  ('Morado','#7c3aed'),('Café','#78350f'),('Naranja','#ea580c'),('Full Color','#64748b');

-- ---------------------------------------------------------------- Tipos de papel
INSERT INTO tipos_papel (nombre) VALUES
  ('Bond'),('Bond Verde'),('Bond Celeste'),('Bond Amarillo'),
  ('Bristol'),('Bristol Celeste'),('Bristol Amarillo'),('Bristol Verde'),
  ('C12'),('Antigrasa'),
  ('Químico Amarillo'),('Químico Celeste'),('Químico Verde'),('Químico Rosado');

-- ---------------------------------------------------------------- Tamaños de talonario
INSERT INTO tamanos_talonario (nombre, orden_visual) VALUES
  ('1/6',1),('1/8',2),('1/12',3),('1/16',4),('1/24',5),('1/32',6),('1/48',7);

-- ---------------------------------------------------------------- Tipos de copia
INSERT INTO tipos_copia (id, nombre, cantidad_hojas) VALUES
  (1,'Sencillo',1),(2,'Duplicado',2),(3,'Triplicado',3),(4,'Cuadruplicado',4);

-- ---------------------------------------------------------------- Materiales HP Latex
INSERT INTO materiales_latex (nombre) VALUES
  ('Adhesivo Brillante'),('Adhesivo Mate'),('Adhesivo Blackout'),
  ('Lona'),('Canva'),('Termoimprimible'),('Otros Adhesivo');

-- ---------------------------------------------------------------- Telas
INSERT INTO telas (nombre) VALUES
  ('SpeedDry'),('Capriatti'),('Madrid'),('Tropical'),('Tecnogold'),
  ('Columbia'),('Columbia Stretch'),('Garota'),('Microspandex'),
  ('Cinta Graduación'),('Lanyard');

-- ---------------------------------------------------------------- Tipos de sobre
-- Pendiente: agregar los nombres reales del catálogo.
INSERT INTO tipos_sobre (nombre) VALUES ('Por definir');

-- ---------------------------------------------------------------- Secuencias
INSERT INTO secuencias (nombre, valor) VALUES ('orden', 1000);

-- ---------------------------------------------------------------- Feriados
-- REVISAR cada año: en Costa Rica varios feriados se trasladan al lunes por ley.
INSERT INTO feriados (fecha, descripcion) VALUES
  ('2026-01-01','Año Nuevo'),
  ('2026-04-02','Jueves Santo'),
  ('2026-04-03','Viernes Santo'),
  ('2026-04-13','Juan Santamaría (trasladado)'),
  ('2026-05-01','Día del Trabajador'),
  ('2026-07-27','Anexión de Guanacaste (trasladado)'),
  ('2026-08-03','Virgen de los Ángeles (trasladado)'),
  ('2026-08-17','Día de la Madre (trasladado)'),
  ('2026-08-31','Día de la Persona Negra'),
  ('2026-09-15','Independencia'),
  ('2026-12-01','Abolición del Ejército'),
  ('2026-12-25','Navidad'),
  ('2027-01-01','Año Nuevo'),
  ('2027-03-25','Jueves Santo'),
  ('2027-03-26','Viernes Santo'),
  ('2027-04-12','Juan Santamaría (trasladado)'),
  ('2027-05-01','Día del Trabajador'),
  ('2027-07-26','Anexión de Guanacaste (trasladado)'),
  ('2027-08-02','Virgen de los Ángeles'),
  ('2027-08-16','Día de la Madre (trasladado)'),
  ('2027-08-30','Día de la Persona Negra (trasladado)'),
  ('2027-09-15','Independencia'),
  ('2027-12-01','Abolición del Ejército'),
  ('2027-12-25','Navidad');
