-- ============================================================================
-- Datos de demostración — Módulo Docentes (Factor 3)
-- ============================================================================
-- Crea 10 docentes ficticios con registros en los 6 dominios del formulario
-- oficial (vinculación, escalafón, formación, evaluación, mejoramiento y
-- redes), más 4 redes académicas que el dominio de Redes necesita como
-- catálogo (la tabla redes_academicas venía vacía y docente_redes.red_id
-- es NOT NULL).
--
-- MARCADOR DE DEMOSTRACIÓN
--   Los docentes usan numero_docente 9001-9010. Ese rango es la única
--   forma de reconocerlos: el resto de datos del sistema es real y este
--   script nunca lo toca.
--
-- Para RETIRAR la demostración:
--   DELETE FROM docentes WHERE numero_docente BETWEEN '9001' AND '9010';
--   DELETE FROM redes_academicas WHERE nombre LIKE 'Red %' OR nombre LIKE 'Asociación %';
--
-- Es idempotente: vuelve a borrar sus propios registros antes de reinsertarlos.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ── Limpieza de la corrida anterior ────────────────────────────────────────
DELETE FROM docentes WHERE numero_docente BETWEEN '9001' AND '9010';
DELETE FROM redes_academicas
 WHERE nombre IN (
   'Red Colombiana de Neuropsicología',
   'Asociación Latinoamericana de Psicología Clínica',
   'Red Universitaria de Salud Mental del Sur Colombiano',
   'Red de Investigación en Psicología y Educación'
 );

-- ── Docentes ───────────────────────────────────────────────────────────────
INSERT INTO docentes (numero_docente, nombre_completo, documento, correo, telefono, cargo, area_enfoque, estado, observaciones)
VALUES
  ('9001','María Fernanda Zambrano Morales','1090000101','mfzambrano@udenar.edu.co','+57 320 555 0101','Profesora Catedrática','neuropsicologia','Activo','Neuropsicología infantil y evaluación cognitiva.'),
  ('9002','Carlos Andrés Guerrero Peña','1090000102','cguerrero@udenar.edu.co','+57 320 555 0102','Profesor Titular','psicologia_clinica','Activo','Psicoterapia breve e intervención en crisis.'),
  ('9003','Luz Adriana Castaño Rojas','1090000103','lcastano@udenar.edu.co','+57 301 555 0103','Profesora Asociada','psicologia_social','Activo','Psicología social y trabajo comunitario.'),
  ('9004','Jhon Edison Pantoja Bórquez','1090000104','jpantoja@udenar.edu.co','+57 301 555 0104','Profesor Asistente','psicologia_educativa','Activo','Psicología educativa y aprendizaje.'),
  ('9005','Sandra Milena Cuéllar Pabón','1090000105','scuellar@udenar.edu.co','+57 315 555 0105','Profesora Titular','neuropsicologia','Activo','Neuropsicología y atención psicosocial.'),
  ('9006','Andrés Felipe Salazar Enríquez','1090000106','asalazar@udenar.edu.co','+57 315 555 0106','Profesor Asistente','psicologia_clinica','Activo','Evaluación clínica y psicometría aplicada.'),
  ('9007','Claudia Milena Ordóñez','1090000107','cordonez@udenar.edu.co','+57 316 555 0107','Profesora Asociada','salud_mental','Activo','Salud mental comunitaria y promoción de la salud.'),
  ('9008','Diego Iván Mesa','1090000108','dmesa@udenar.edu.co','+57 316 555 0108','Profesor Titular','psicologia_social','Activo','Psicología organizacional y bienestar laboral.'),
  ('9009','Gloria Patricia Minda','1090000109','gminda@udenar.edu.co','+57 317 555 0109','Profesora Asistente','psicologia_educativa','Activo','Intervención y evaluación de procesos de aprendizaje.'),
  ('9010','Luis Fernando Cabrera','1090000110','lcabrera@udenar.edu.co','+57 317 555 0110','Profesor Titular Jubilado','neuropsicologia','Jubilado','Neuropsicología experimental.');

-- ── Redes académicas (catálogo requerido por docente_redes) ────────────────
INSERT INTO redes_academicas (nombre, tipo_alcance, descripcion, sitio_web)
VALUES
  ('Red Colombiana de Neuropsicología','Nacional','Asociación de investigadores y clínicos en neuropsicología del país.','https://redcolneuro.org'),
  ('Asociación Latinoamericana de Psicología Clínica','Internacional','Sociedad de intercambio clínico y actualización científica.','https://alpc-org.org'),
  ('Red Universitaria de Salud Mental del Sur Colombiano','Regional','Nodo de universidades del sur del país para acciones comunitarias.','https://rusaludmental.co'),
  ('Red de Investigación en Psicología y Educación','Nacional','Grupo de trabajo conjunto sobre enseñanza y aprendizaje.','https://redipye.edu.co');

-- ── 1) Vinculación ─────────────────────────────────────────────────────────
INSERT INTO docente_vinculaciones
  (docente_id, anio_vinculacion, fecha_vinculacion, tipo_vinculacion, dedicacion, tiempo_vinculacion, horas_semanales, acto_vinculacion, acuerdo_hora_catedra, observaciones)
SELECT d.id, v.anio, v.fecha, v.tipo, v.ded, v.tiempo, v.horas, v.acto, v.acuerdo, v.obs
FROM (VALUES
  ('9001', 2019, DATE '2019-02-11', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2019-0234', NULL, 'Ingreso por concurso docente.'),
  ('9001', 2026, DATE '2026-02-02', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2026-0118', NULL, 'Renovación del vínculo.'),
  ('9002', 2016, DATE '2016-03-01', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2016-0471', NULL, 'Ingreso por concurso docente.'),
  ('9002', 2026, DATE '2026-01-20', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2026-0092', NULL, 'Renovación del vínculo.'),
  ('9003', 2026, DATE '2026-02-16', 'Medio tiempo', 'Dedicación media', 'Permanente', 20, 'Resolución 2026-0134', NULL, 'Vinculación por tiempo parcial.'),
  ('9004', 2026, DATE '2026-02-16', 'Hora cátedra', 'Por horas', 'Por período', 12, 'Resolución 2026-0134', 'Acuerdo 2026-0077', 'Horas cátedra por período académico.'),
  ('9005', 2021, DATE '2021-02-08', 'Medio tiempo', 'Dedicación media', 'Permanente', 20, 'Resolución 2021-0210', NULL, 'Ingreso por tiempo parcial.'),
  ('9005', 2026, DATE '2026-01-26', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2026-0104', NULL, 'Cambio de modalidad a tiempo completo.'),
  ('9006', 2026, DATE '2026-02-16', 'Hora cátedra', 'Por horas', 'Por período', 10, 'Resolución 2026-0134', 'Acuerdo 2026-0077', 'Horas cátedra por período académico.'),
  ('9007', 2026, DATE '2026-02-16', 'Medio tiempo', 'Dedicación media', 'Permanente', 20, 'Resolución 2026-0134', NULL, 'Vinculación por tiempo parcial.'),
  ('9008', 2026, DATE '2026-02-02', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2026-0118', NULL, 'Renovación del vínculo.'),
  ('9009', 2026, DATE '2026-02-16', 'Hora cátedra', 'Por horas', 'Por período', 12, 'Resolución 2026-0134', 'Acuerdo 2026-0077', 'Horas cátedra por período académico.'),
  ('9010', 2025, DATE '2025-02-03', 'Tiempo completo', 'Tiempo completo', 'Permanente', 40, 'Resolución 2025-0098', NULL, 'Última vinculación antes del retiro.')
) AS v(num, anio, fecha, tipo, ded, tiempo, horas, acto, acuerdo, obs)
JOIN docentes d ON d.numero_docente = v.num;

-- ── 2) Escalafón ───────────────────────────────────────────────────────────
-- El valor del Decreto 1279 es la cita normativa; el acto interno de ascenso
-- va en su propia columna (`acto_ascenso`).
INSERT INTO docente_escalafones
  (docente_id, nivel, categoria, fecha, decreto_1279, acto_ascenso, fecha_ascenso)
SELECT d.id, v.nivel, v.categoria, v.fecha, 'Decreto 1279 de 2002', v.acto, v.ascenso
FROM (VALUES
  ('9001','Asociado','2', DATE '2014-09-01','Resolución 2014-0301', DATE '2014-09-01'),
  ('9001','Titular','1',  DATE '2019-03-05','Resolución 2019-0321', DATE '2019-03-05'),
  ('9001','Catedrático','1',DATE '2024-02-20','Resolución 2024-0118', DATE '2024-02-20'),
  ('9002','Asistente','3',DATE '2010-07-15','Resolución 2010-0455', DATE '2010-07-15'),
  ('9002','Asociado','2', DATE '2015-08-10','Resolución 2015-0210', DATE '2015-08-10'),
  ('9002','Titular','1',  DATE '2020-06-18','Resolución 2020-0177', DATE '2020-06-18'),
  ('9003','Asistente','3',DATE '2012-08-22','Resolución 2012-0333', DATE '2012-08-22'),
  ('9003','Asociado','2', DATE '2018-05-09','Resolución 2018-0142', DATE '2018-05-09'),
  ('9004','Auxiliar','4', DATE '2019-02-25','Resolución 2019-0155', DATE '2019-02-25'),
  ('9004','Asistente','3',DATE '2023-09-14','Resolución 2023-0289', DATE '2023-09-14'),
  ('9005','Titular','1',  DATE '2013-04-30','Resolución 2013-0221', DATE '2013-04-30'),
  ('9005','Catedrático','1',DATE '2021-11-08','Resolución 2021-0402', DATE '2021-11-08'),
  ('9006','Asistente','3',DATE '2020-03-12','Resolución 2020-0099', DATE '2020-03-12'),
  ('9007','Asociado','2', DATE '2014-07-21','Resolución 2014-0266', DATE '2014-07-21'),
  ('9007','Titular','1',  DATE '2022-02-14','Resolución 2022-0088', DATE '2022-07-21'),
  ('9008','Titular','1',  DATE '2011-10-05','Resolución 2011-0311', DATE '2014-07-21'),
  ('9008','Catedrático','1',DATE '2019-08-27','Resolución 2019-0377', DATE '2019-08-27'),
  ('9009','Auxiliar','4', DATE '2021-03-15','Resolución 2021-0110', DATE '2021-03-15'),
  ('9010','Titular','1',  DATE '2012-08-20','Resolución 2012-0245', DATE '2012-08-20'),
  ('9010','Catedrático','1',DATE '2017-02-14','Resolución 2017-0092', DATE '2017-02-14')
) AS v(num, nivel, categoria, fecha, acto, ascenso)
JOIN docentes d ON d.numero_docente = v.num;

-- ── 3) Formación académica ─────────────────────────────────────────────────
INSERT INTO docente_formaciones
  (docente_id, nivel_formacion, titulo, programa, institucion, pais, anio_graduacion, formacion_complementaria)
SELECT d.id, v.nivel, v.titulo, v.programa, v.institucion, v.pais, v.anio, v.comp
FROM (VALUES
  ('9001','Pregrado','Psicóloga','Psicología','Universidad de Nariño','Colombia',2008,NULL),
  ('9001','Maestría','Magíster en Neuropsicología','Neuropsicología','Universidad de Nariño','Colombia',2014,NULL),
  ('9001','Doctorado','Doctora en Psicología','Psicología','Universidad Nacional de Colombia','Colombia',2019,NULL),
  ('9002','Pregrado','Psicólogo','Psicología','Universidad de Nariño','Colombia',2009,NULL),
  ('9002','Maestría','Magíster en Psicología Clínica','Psicología Clínica','Universidad del Valle','Colombia',2015,NULL),
  ('9003','Pregrado','Psicóloga','Psicología','Universidad de Nariño','Colombia',2011,NULL),
  ('9003','Maestría','Magíster en Psicología Social','Psicología Social','Universidad Pedagógica Nacional','Colombia',2017,NULL),
  ('9004','Pregrado','Psicólogo','Psicología','Universidad de Nariño','Colombia',2010,NULL),
  ('9004','Maestría','Magíster en Educación','Educación','Universidad de Nariño','Colombia',2016,NULL),
  ('9004','Especialización','Especialista en Docencia Universitaria','Docencia Universitaria','Universidad de Nariño','Colombia',2018,NULL),
  ('9005','Pregrado','Psicóloga','Psicología','Universidad de Nariño','Colombia',2003,NULL),
  ('9005','Doctorado','Doctora en Neuropsicología','Neuropsicología','Universidad de Salamanca','España',2011,NULL),
  ('9006','Pregrado','Psicólogo','Psicología','Universidad de Nariño','Colombia',2013,NULL),
  ('9006','Especialización','Especialista en Evaluación y Medición','Psicometría','Universidad de Antioquia','Colombia',2019,NULL),
  ('9007','Pregrado','Psicóloga','Psicología','Universidad de Nariño','Colombia',2007,NULL),
  ('9007','Maestría','Magíster en Salud Mental Comunitaria','Salud Mental','Universidad del Cauca','Colombia',2014,NULL),
  ('9008','Pregrado','Psicólogo','Psicología','Universidad de Nariño','Colombia',2002,NULL),
  ('9008','Maestría','Magíster en Psicología Organizacional','Psicología Organizacional','Universidad del Valle','Colombia',2009,NULL),
  ('9009','Pregrado','Psicóloga','Psicología','Universidad de Nariño','Colombia',2012,NULL),
  ('9009','Maestría','Magíster en Pedagogía','Pedagogía','Universidad de Nariño','Colombia',2020,NULL),
  ('9010','Pregrado','Psicólogo','Psicología','Universidad de Nariño','Colombia',1995,NULL),
  ('9010','Maestría','Magíster en Neuropsicología','Neuropsicología','Universidad Nacional de Colombia','Colombia',2003,NULL)
) AS v(num, nivel, titulo, programa, institucion, pais, anio, comp)
JOIN docentes d ON d.numero_docente = v.num;

-- ── 4) Evaluación docente ──────────────────────────────────────────────────
-- Una fila por evaluador. `tipo_evaluacion` describe la clase de evaluación;
-- `evaluador` identifica quién la realiza.
INSERT INTO docente_evaluaciones
  (docente_id, anio, periodo, tipo_evaluacion, evaluador, escala, resultado, accion_mejora, observaciones)
SELECT d.id, v.anio, v.periodo, v.tipo, v.evaluador, v.escala, v.resultado, v.accion, v.obs
FROM (VALUES
  ('9001',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.6,'Fortalecer el uso de rúbricas en los talleres.',NULL),
  ('9001',2026,'Semestre A','Evaluación por pares académicos','Colegas','1-5',4.4,NULL,NULL),
  ('9001',2025,'Anual','Evaluación externa','Externas','1-100',88,'Mantener el plan de lecturas de la línea base.',NULL),
  ('9002',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.4,NULL,NULL),
  ('9002',2026,'Semestre A','Evaluación de desempeño por jefes','Jefes','1-5',4.2,'Reportar con periodicidad los avances de investigación.',NULL),
  ('9002',2025,'Anual','Autoevaluación docente','Autoevaluación','1-5',4.0,NULL,NULL),
  ('9003',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.7,NULL,NULL),
  ('9003',2026,'Semestre A','Evaluación por pares académicos','Colegas','1-5',4.5,NULL,NULL),
  ('9003',2026,'Semestre A','Autoevaluación docente','Autoevaluación','1-5',4.3,NULL,NULL),
  ('9004',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.1,'Mejorar la retroalimentación de las tareas.',NULL),
  ('9004',2026,'Semestre A','Autoevaluación docente','Autoevaluación','1-5',4.0,NULL,NULL),
  ('9005',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.8,NULL,NULL),
  ('9005',2026,'Semestre A','Evaluación de desempeño por jefes','Jefes','1-5',4.6,NULL,NULL),
  ('9005',2025,'Anual','Evaluación externa','Externas','1-100',92,NULL,NULL),
  ('9006',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.0,NULL,NULL),
  ('9006',2026,'Semestre A','Autoevaluación docente','Autoevaluación','1-5',3.9,NULL,NULL),
  ('9007',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.5,NULL,NULL),
  ('9007',2026,'Semestre A','Evaluación por pares académicos','Colegas','1-5',4.4,NULL,NULL),
  ('9008',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.2,NULL,NULL),
  ('9008',2026,'Semestre A','Evaluación de desempeño por jefes','Jefes','1-5',4.3,NULL,NULL),
  ('9009',2026,'Semestre A','Evaluación de la docencia por estudiantes','Estudiantes','1-5',4.3,NULL,NULL),
  ('9009',2026,'Semestre A','Autoevaluación docente','Autoevaluación','1-5',4.1,NULL,NULL),
  ('9010',2026,'Semestre A','Evaluación por pares académicos','Colegas','1-5',4.6,NULL,NULL),
  ('9010',2025,'Anual','Autoevaluación docente','Autoevaluación','1-5',4.5,NULL,NULL)
) AS v(num, anio, periodo, tipo, evaluador, escala, resultado, accion, obs)
JOIN docentes d ON d.numero_docente = v.num;

-- ── 5) Planes de mejoramiento ──────────────────────────────────────────────
INSERT INTO docente_planes_mejoramiento
  (docente_id, anio, periodo, plan, hallazgo, accion, responsable, estado, fecha_inicio, fecha_fin)
SELECT d.id, v.anio, v.periodo, v.plan, v.hallazgo, v.accion, v.responsable, v.estado, v.f_ini, v.f_fin
FROM (VALUES
  ('9001',2026,'Semestre A','Ajuste de la ruta de neuropsicología','Exceso de contenido teórico en la ruta','Reorganizar las unidades prácticas con casos reales','María Fernanda Zambrano Morales','En proceso',DATE '2026-03-02',DATE '2026-06-30'),
  ('9002',2026,'Semestre A','Protocolo de intervención en crisis','Aumento de casos de crisis por encima de lo previsto','Documentar el protocolo de triaje y derivación','Carlos Andrés Guerrero Peña','Pendiente',DATE '2026-04-01',DATE '2026-10-31'),
  ('9003',2026,'Semestre A','Criterios de evaluación de impacto','No se registró impacto de las prácticas comunitarias','Definir instrumentos de medición con las comunidades','Luz Adriana Castaño Rojas','En proceso',DATE '2026-02-16',DATE '2026-11-30'),
  ('9004',2026,'Semestre A','Retroalimentación continua en el aula','Resultados heterogéneos en la primera parcial','Aplicar rúbricas y devoluciones semanales','Jhon Edison Pantoja Bórquez','Cumplido',DATE '2026-02-16',DATE '2026-07-31'),
  ('9005',2026,'Semestre A','Seguimiento a casos de rehabilitación','Seguimiento discontinuo de los casos remitidos','Centralizar los casos en una carpeta compartida','Sandra Milena Cuéllar Pabón','En proceso',DATE '2026-03-02',DATE '2026-10-30'),
  ('9006',2026,'Semestre A','Actualización en psicometría','Desactualización en pruebas estandarizadas','Programar un plan de actualización anual','Andrés Felipe Salazar Enríquez','Pendiente',DATE '2026-04-01',DATE '2026-11-30'),
  ('9007',2026,'Semestre A','Vinculación comunitaria sostenida','Participación intermitente en los territorios','Definir un cronograma permanente de visitas','Claudia Milena Ordóñez','En proceso',DATE '2026-03-02',DATE '2026-12-15'),
  ('9008',2026,'Semestre A','Bienestar laboral del equipo','Indicadores de clima laboral sin seguimiento','Implementar mediciones semestrales','Diego Iván Mesa','Cumplido',DATE '2026-02-16',DATE '2026-08-31'),
  ('9009',2026,'Semestre A','Uso de TIC en el aula','Poca integración de herramientas digitales','Capacitarse en herramientas de apoyo pedagógico','Gloria Patricia Minda','Pendiente',DATE '2026-04-15',DATE '2026-10-15'),
  ('9010',2026,'Semestre A','Cierre y relevo de procesos','Transferencia incompleta de procesos investigativos','Documentar protocolos para el equipo entrante','Luis Fernando Cabrera','En proceso',DATE '2026-02-02',DATE '2026-06-30')
) AS v(num, anio, periodo, plan, hallazgo, accion, responsable, estado, f_ini, f_fin)
JOIN docentes d ON d.numero_docente = v.num;

-- ── 5b) Categoría de investigador del último escalafón ─────────────────────
UPDATE docente_escalafones
   SET categoria_investigador = c.valor
  FROM (VALUES ('9001','Senior'),('9002','Asociado'),('9003','Junior'),
               ('9004','Junior'),('9005','Senior'),('9006','Junior'),
               ('9007','Asociado'),('9008','Asociado'),('9009','Junior'),
               ('9010','Senior')) AS c(num, valor)
 WHERE docente_escalafones.docente_id IN (
   SELECT e.docente_id FROM docente_escalafones e
    JOIN docentes d ON d.id = e.docente_id
   WHERE d.numero_docente = c.num
     AND e.fecha = (SELECT MAX(e2.fecha) FROM docente_escalafones e2 WHERE e2.docente_id = e.docente_id)
 );

-- ── 6) Redes académicas (participación) ────────────────────────────────────
INSERT INTO docente_redes
  (docente_id, red_id, anio_inicio, anio_fin, periodo, tipo_participacion, participacion, impacto, resultados, enlace_referencia)
SELECT d.id, r.id, v.anio_ini, v.anio_fin, v.periodo, v.tipo, v.participacion, v.impacto, v.resultados, v.enlace
FROM (VALUES
  ('9001','Red Colombiana de Neuropsicología',2022,NULL,'Anual','Miembro','Participación en el comité de validación de pruebas.','Fortalecimiento de los procesos de evaluación.','Protocolo interno de evaluación neuropsicológica.','https://redcolneuro.org/miembros'),
  ('9001','Asociación Latinoamericana de Psicología Clínica',2024,NULL,'Anual','Coordinador','Coordinación del grupo de guías clínicas.','Adopción de una guía regional de buenas prácticas.','Guía de práctica clínica publicada.','https://alpc-org.org/guias'),
  ('9002','Red Universitaria de Salud Mental del Sur Colombiano',2023,NULL,'Semestre A','Miembro','Atención de casos en jornadas de salud mental.','Mejora en la atención de crisis en la comunidad.','Informe de jornada comunitaria.',NULL),
  ('9003','Red Universitaria de Salud Mental del Sur Colombiano',2021,NULL,'Anual','Coordinador','Coordinación del nodo de psicología social.','Articulación con organizaciones comunitarias.','Acuerdos de trabajo con tres organizaciones.','https://rusaludmental.co'),
  ('9004','Red de Investigación en Psicología y Educación',2023,NULL,'Semestre B','Miembro','Participación en el proyecto de aula invertida.','Mejoras en los resultados de aprendizaje.','Ponencia en encuentro de educación.',NULL),
  ('9005','Red Colombiana de Neuropsicología',2020,NULL,'Anual','Presidente','Presidencia del comité científico.','Posicionamiento de la neuropsicología regional.','Simposio anual organizado.',NULL),
  ('9006','Red Colombiana de Neuropsicología',2024,NULL,'Semestre A','Miembro','Participación en la estandarización de pruebas.','Instrumentos validados para la región.','Manual de estandarización.','https://redcolneuro.org/estandarizacion'),
  ('9007','Red Universitaria de Salud Mental del Sur Colombiano',2022,NULL,'Anual','Miembro','Gestión de proyectos de promoción de la salud.','Aumento de la cobertura de atención primaria.','Informe de gestión anual.',NULL),
  ('9008','Asociación Latinoamericana de Psicología Clínica',2023,NULL,'Semestre A','Miembro','Participación en el grupo de bienestar laboral.','Buenas prácticas de clima organizacional.','Documento de recomendaciones.','https://alpc-org.org/bienestar'),
  ('9009','Red de Investigación en Psicología y Educación',2024,NULL,'Semestre A','Miembro','Participación en el semillero de investigación.','Formación de estudiantes en investigación.','Artículo conjunto con estudiantes.',NULL),
  ('9010','Red Colombiana de Neuropsicología',2015,2020,'Anual','Miembro','Participación en investigaciones multicéntricas.','Producción científica conjunta.','Dos publicaciones conjuntas.',NULL)
) AS v(num, red, anio_ini, anio_fin, periodo, tipo, participacion, impacto, resultados, enlace)
JOIN docentes d ON d.numero_docente = v.num
JOIN redes_academicas r ON r.nombre = v.red;

COMMIT;

-- ── Verificación ───────────────────────────────────────────────────────────
SELECT 'docentes demo' AS tabla, count(*) AS filas FROM docentes WHERE numero_docente BETWEEN '9001' AND '9010'
UNION ALL SELECT 'redes_academicas', count(*) FROM redes_academicas
UNION ALL SELECT 'docente_vinculaciones', count(*) FROM docente_vinculaciones
UNION ALL SELECT 'docente_escalafones', count(*) FROM docente_escalafones
UNION ALL SELECT 'docente_formaciones', count(*) FROM docente_formaciones
UNION ALL SELECT 'docente_evaluaciones', count(*) FROM docente_evaluaciones
UNION ALL SELECT 'docente_planes_mejoramiento', count(*) FROM docente_planes_mejoramiento
UNION ALL SELECT 'docente_redes', count(*) FROM docente_redes
ORDER BY 1;
