-- ============================================================================
-- Datos de demostración — Módulo Egresados (Factor 4)
-- ============================================================================
-- Crea 10 egresados ficticios del programa de Psicología con registros en
-- las pestañas del formulario oficial (información general, vinculación a
-- grupos de investigación, vinculación a posgrados, servicios de bienestar,
-- seguimiento al proceso de grado y reconocimientos), más los dos catálogos
-- globales del Factor 4 (políticas en torno a egresados y formación continua).
--
-- MARCADOR DE DEMOSTRACIÓN
--   Las cédulas van en el rango 91000001-91000010. Ese rango es la única
--   forma de reconocerlos: el resto de datos del sistema es real y este
--   script nunca lo toca.
--
-- Para RETIRAR la demostración:
--   DELETE FROM egresados WHERE cedula BETWEEN '91000001' AND '91000010';
--   DELETE FROM politicas_egresados WHERE nombre IN (...);   -- ver abajo
--   DELETE FROM formacion_continua
--     WHERE participante_identificacion BETWEEN '91000001' AND '91000010';
--
-- Las tablas hijas por egresado caen con ON DELETE CASCADE, por lo que basta
-- borrar el egresado. Es idempotente: vuelve a borrar sus propios registros
-- antes de reinsertarlos.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ── Limpieza de la corrida anterior ────────────────────────────────────────
DELETE FROM egresados WHERE cedula BETWEEN '91000001' AND '91000010';
DELETE FROM formacion_continua
 WHERE participante_identificacion BETWEEN '91000001' AND '91000010';
DELETE FROM politicas_egresados
 WHERE nombre IN (
   'Política de Vinculación de Egresados al Programa',
   'Política de Seguimiento a Egresados',
   'Política de Formación Continua para Egresados'
 );

-- ── Egresados (Información general) ────────────────────────────────────────
INSERT INTO egresados (nombre_completo, cedula, titulacion, anio_graduacion, telefono, correo, observaciones)
VALUES
  ('Ana Lucía Paredes Gómez','91000001','Psicóloga',2015,'+57 310 555 0101','ana.paredes@udenar.edu.co','Interesada en investigación en neurociencias.'),
  ('Carlos Andrés Muñoz Erazo','91000002','Psicólogo',2013,'+57 311 555 0102','carlos.munoz@udenar.edu.co','Vinculado al sector clínico.'),
  ('Diana Marcela Rivas Chamorro','91000003','Psicóloga',2018,'+57 312 555 0103','diana.rivas@udenar.edu.co','Enfocada en psicología educativa.'),
  ('Andrés Felipe Ortiz Benavides','91000004','Psicólogo',2011,'+57 313 555 0104','andres.ortiz@udenar.edu.co',NULL),
  ('Laura Sofía Guerrero Pantoja','91000005','Psicóloga',2019,'+57 314 555 0105','laura.guerrero@udenar.edu.co','Participa activamente en semilleros.'),
  ('Jhon Sebastián Bravo Córdoba','91000006','Psicólogo',2016,'+57 315 555 0106','jhon.bravo@udenar.edu.co',NULL),
  ('Paula Andrea Mosquera Luna','91000007','Psicóloga',2020,'+57 316 555 0107','paula.mosquera@udenar.edu.co','Interés en temas de bienestar universitario.'),
  ('Camilo Esteban Díaz Rosero','91000008','Psicólogo',2012,'+57 317 555 0108','camilo.diaz@udenar.edu.co',NULL),
  ('Valentina Herrera Osorio','91000009','Psicóloga',2021,'+57 318 555 0109','valentina.herrera@udenar.edu.co','Recién graduada, en búsqueda de posgrado.'),
  ('Felipe Alejandro Caicedo Mora','91000010','Psicólogo',2014,'+57 319 555 0110','felipe.caicedo@udenar.edu.co',NULL);

-- ── 1) Vinculación a grupos de investigación ───────────────────────────────
INSERT INTO egresado_grupos_investigacion (egresado_id, vinculado, nombre_grupo, anio, estado)
SELECT e.id, v.vinculado, v.nombre_grupo, v.anio, v.estado
FROM (VALUES
  ('91000001','Sí','Grupo de Investigación en Neurociencias Cognitivas',2016,'Activo'),
  ('91000001','Sí','Semillero de Psicología Social Comunitaria',2015,'Inactivo'),
  ('91000002','Sí','Grupo de Investigación en Salud Mental y Bienestar',2014,'Activo'),
  ('91000003','Sí','Grupo de Estudios en Educación y Aprendizaje',2019,'Activo'),
  ('91000004','Sí','Grupo de Investigación en Psicología Clínica',2012,'Activo'),
  ('91000005','Sí','Semillero de Investigación en Comportamiento Humano',2020,'Activo'),
  ('91000005','Sí','Grupo de Investigación en Neurociencias Cognitivas',2019,'Activo'),
  ('91000006','Sí','Grupo de Investigación en Salud Mental y Bienestar',2017,'Inactivo'),
  ('91000007','Sí','Grupo de Estudios en Educación y Aprendizaje',2021,'Activo'),
  ('91000008','Sí','Grupo de Investigación en Psicología Clínica',2013,'Inactivo'),
  ('91000009','Sí','Semillero de Investigación en Comportamiento Humano',2022,'Activo'),
  ('91000010','Sí','Grupo de Investigación en Neurociencias Cognitivas',2014,'Activo')
) AS v(cedula, vinculado, nombre_grupo, anio, estado)
JOIN egresados e ON e.cedula = v.cedula;

-- ── 2) Vinculación a posgrados ─────────────────────────────────────────────
INSERT INTO egresado_posgrados (egresado_id, vinculado, nombre_posgrado, anio, estado)
SELECT e.id, v.vinculado, v.nombre_posgrado, v.anio, v.estado
FROM (VALUES
  ('91000001','Sí','Maestría en Neuropsicología',2016,'Activo'),
  ('91000002','Sí','Especialización en Psicología Clínica',2014,'Activo'),
  ('91000003','Sí','Especialización en Psicología Educativa',2019,'Activo'),
  ('91000004','Sí','Maestría en Psicología Clínica',2012,'Activo'),
  ('91000005','Sí','Maestría en Psicología Social',2020,'Activo'),
  ('91000006','Sí','Especialización en Psicología Organizacional',2017,'Inactivo'),
  ('91000007','Sí','Maestría en Educación',2021,'Activo'),
  ('91000009','Sí','Maestría en Neuropsicología',2022,'Activo'),
  ('91000010','Sí','Doctorado en Psicología',2015,'Inactivo')
) AS v(cedula, vinculado, nombre_posgrado, anio, estado)
JOIN egresados e ON e.cedula = v.cedula;

-- ── 3) Servicios de bienestar (una fila por servicio utilizado) ────────────
INSERT INTO egresado_bienestar (egresado_id, servicio)
SELECT e.id, v.servicio
FROM (VALUES
  ('91000001','Becas de Alimentación'),
  ('91000001','Área de Salud'),
  ('91000002','Auxilio de Arrendamiento'),
  ('91000003','Tutorías Y Monitorias'),
  ('91000004','Fondo de Solidaridad'),
  ('91000004','Área de Salud'),
  ('91000005','Actividades Culturales'),
  ('91000005','Deportes'),
  ('91000006','Becas de Alimentación'),
  ('91000007','Tutorías Y Monitorias'),
  ('91000007','Actividades Culturales'),
  ('91000008','Fondo de Solidaridad'),
  ('91000009','Deportes'),
  ('91000010','Auxilio de Arrendamiento')
) AS v(cedula, servicio)
JOIN egresados e ON e.cedula = v.cedula;

-- ── 4) Seguimiento al proceso de grado ─────────────────────────────────────
INSERT INTO egresado_seguimiento_grado (egresado_id, fecha_egreso, tiempo_transcurrido)
SELECT e.id, v.fecha_egreso::date, v.tiempo_transcurrido
FROM (VALUES
  ('91000001','2015-06-11','Grado en el periodo siguiente al grado de materias'),
  ('91000002','2013-06-13','Menos de 1 año'),
  ('91000003','2018-06-14','Grado inmediato'),
  ('91000004','2011-06-09','Grado inmediato'),
  ('91000005','2019-06-13','Grado inmediato'),
  ('91000006','2016-06-09','Entre 1 y 2 años'),
  ('91000007','2020-06-11','Grado inmediato'),
  ('91000008','2012-06-14','Grado inmediato'),
  ('91000009','2021-06-10','Grado inmediato'),
  ('91000010','2014-06-12','Menos de 1 año')
) AS v(cedula, fecha_egreso, tiempo_transcurrido)
JOIN egresados e ON e.cedula = v.cedula;

-- ── 5) Reconocimientos, distinciones y logros ──────────────────────────────
INSERT INTO egresado_reconocimientos (egresado_id, tipo_reconocimiento, anio_entrega, nombre_reconocimiento)
SELECT e.id, v.tipo_reconocimiento, v.anio_entrega, v.nombre_reconocimiento
FROM (VALUES
  ('91000001','Matrícula de Honor',2015,'Mejor promedio de la cohorte'),
  ('91000003','Mejor Trabajo de Grado',2018,'Investigación en educación inclusiva'),
  ('91000004','Grado de Honor',2011,'Excelencia académica'),
  ('91000005','Reconocimiento Saber Pro',2019,'Puntaje sobresaliente en Saber Pro'),
  ('91000007','Distinción a la Excelencia Académica',2020,'Promedio destacado'),
  ('91000009','Reconocimiento a la Investigación',2021,'Ponencia destacada en congreso nacional')
) AS v(cedula, tipo_reconocimiento, anio_entrega, nombre_reconocimiento)
JOIN egresados e ON e.cedula = v.cedula;

-- ── Catálogo global: políticas en torno a egresados ────────────────────────
INSERT INTO politicas_egresados (nombre, objeto, link)
VALUES
  ('Política de Vinculación de Egresados al Programa',
   'Establecer mecanismos de vinculación permanente entre el programa y sus egresados, promoviendo su participación en actividades académicas, investigativas y de extensión.',
   'https://psicologia.udenar.edu.co/politicas/vinculacion-egresados'),
  ('Política de Seguimiento a Egresados',
   'Definir el proceso de seguimiento y actualización de la información de los egresados, para evaluar el impacto del programa y retroalimentar los procesos de autoevaluación.',
   'https://psicologia.udenar.edu.co/politicas/seguimiento-egresados'),
  ('Política de Formación Continua para Egresados',
   'Facilitar el acceso de los egresados a programas de educación continua y actualización profesional, en articulación con las necesidades del entorno laboral.',
   'https://psicologia.udenar.edu.co/politicas/formacion-continua');

-- ── Catálogo global: formación continua (una fila por participante) ────────
INSERT INTO formacion_continua
  (nombre_programa, tipo_programa, fecha, participante_identificacion, participante_nombre)
VALUES
  ('Diplomado en Primeros Auxilios Psicológicos','Diplomado','2019-08-15','91000001','Ana Lucía Paredes Gómez'),
  ('Curso de Neuropsicología Infantil','Curso','2020-03-10','91000001','Ana Lucía Paredes Gómez'),
  ('Seminario de Actualización en Psicología Clínica','Seminario','2018-09-20','91000002','Carlos Andrés Muñoz Erazo'),
  ('Diplomado en Educación Inclusiva','Diplomado','2020-02-18','91000003','Diana Marcela Rivas Chamorro'),
  ('Taller de Terapia de Pareja y Familia','Taller','2019-11-05','91000004','Andrés Felipe Ortiz Benavides'),
  ('Curso de Evaluación Psicológica Forense','Curso','2021-04-22','91000005','Laura Sofía Guerrero Pantoja'),
  ('Diplomado en Gestión del Talento Humano','Diplomado','2019-11-05','91000006','Jhon Sebastián Bravo Córdoba'),
  ('Curso de Psicología del Deporte','Curso','2021-05-06','91000007','Paula Andrea Mosquera Luna'),
  ('Seminario de Neurociencias y Aprendizaje','Seminario','2022-04-21','91000009','Valentina Herrera Osorio'),
  ('Curso de Terapia Cognitivo-Conductual','Curso','2019-10-03','91000010','Felipe Alejandro Caicedo Mora');

COMMIT;

-- ── Resumen ────────────────────────────────────────────────────────────────
SELECT 'egresados' AS tabla, COUNT(*) FROM egresados WHERE cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'grupos', COUNT(*) FROM egresado_grupos_investigacion g
  JOIN egresados e ON e.id = g.egresado_id WHERE e.cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'posgrados', COUNT(*) FROM egresado_posgrados p
  JOIN egresados e ON e.id = p.egresado_id WHERE e.cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'bienestar', COUNT(*) FROM egresado_bienestar b
  JOIN egresados e ON e.id = b.egresado_id WHERE e.cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'seguimiento', COUNT(*) FROM egresado_seguimiento_grado s
  JOIN egresados e ON e.id = s.egresado_id WHERE e.cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'reconocimientos', COUNT(*) FROM egresado_reconocimientos r
  JOIN egresados e ON e.id = r.egresado_id WHERE e.cedula BETWEEN '91000001' AND '91000010'
UNION ALL SELECT 'politicas', COUNT(*) FROM politicas_egresados
  WHERE nombre IN ('Política de Vinculación de Egresados al Programa',
                   'Política de Seguimiento a Egresados',
                   'Política de Formación Continua para Egresados')
UNION ALL SELECT 'formacion_continua', COUNT(*) FROM formacion_continua
  WHERE participante_identificacion BETWEEN '91000001' AND '91000010';
