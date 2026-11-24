-- ============================================
-- SISACRE — Migración: Módulo Docentes (Factor 3)
-- ============================================
-- Uso (instancia existente, con volumen postgres_data poblado):
--
--   docker exec -i sisacre_db psql -U sisacre_user -d sisacre_db \
--     < backend/src/config/migrate-docentes.sql
--
-- Es idempotente: puede ejecutarse varias veces sin efectos colaterales.
-- No modifica los datos de las tablas existentes, salvo la limpieza
-- intencional de la sección final: se eliminan las tablas de capacitaciones,
-- planes de capacitación e investigación porque el formulario oficial del
-- Factor 3 ya no contempla esos apartados. Las evidencias ya cargadas siguen
-- visibles como evidencia general del docente (`documentos.docente_id`).
-- ============================================

\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Entidad principal: docente ──────────────────────────────────────
-- La unicidad se aplica con índices PARCIALES sobre `activo = TRUE` (ver
-- más abajo). Con un UNIQUE normal, un docente eliminado lógicamente
-- seguiría ocupando su número y su cuenta de usuario para siempre,
-- impediriendo reingresarlo o revincular la cuenta a otra ficha.
CREATE TABLE IF NOT EXISTS docentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_docente VARCHAR(30) NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    documento VARCHAR(20),
    correo VARCHAR(150),
    telefono VARCHAR(30),
    cargo VARCHAR(100),
    area_enfoque VARCHAR(200),
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo'
        CHECK (estado IN ('Activo', 'Inactivo', 'Jubilado', 'Licencia')),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Primero se construyen los índices parciales; solo cuando existen se
-- retiran los UNIQUE originales. Si el módulo se migra sobre una base
-- que ya tiene las claves, DROP INDEX no basta: son restricciones.
CREATE UNIQUE INDEX IF NOT EXISTS uq_docentes_numero_activo
    ON docentes(numero_docente) WHERE activo = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_docentes_usuario_activo
    ON docentes(usuario_id) WHERE activo = TRUE AND usuario_id IS NOT NULL;

ALTER TABLE docentes DROP CONSTRAINT IF EXISTS docentes_numero_docente_key;
ALTER TABLE docentes DROP CONSTRAINT IF EXISTS docentes_usuario_id_key;

-- ── Historial de vinculación ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS docente_vinculaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    anio_vinculacion INTEGER NOT NULL CHECK (anio_vinculacion BETWEEN 1900 AND 2200),
    fecha_vinculacion DATE,
    tipo_vinculacion VARCHAR(30) NOT NULL
        CHECK (tipo_vinculacion IN ('Tiempo completo', 'Hora cátedra', 'Medio tiempo')),
    dedicacion VARCHAR(30)
        CHECK (dedicacion IN ('Tiempo completo', 'Dedicación media', 'Tiempo parcial', 'Por horas')),
    tiempo_vinculacion VARCHAR(30)
        CHECK (tiempo_vinculacion IN ('Permanente', 'Temporal', 'Por período')),
    horas_semanales NUMERIC(5,2) CHECK (horas_semanales IS NULL OR horas_semanales > 0),
    acto_vinculacion VARCHAR(200),
    acuerdo_hora_catedra VARCHAR(200),
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    observaciones TEXT,
    registrado_por UUID REFERENCES usuarios(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (docente_id, anio_vinculacion, tipo_vinculacion)
);

-- ── Formación académica ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS docente_formaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    nivel_formacion VARCHAR(30) NOT NULL
        CHECK (nivel_formacion IN ('Pregrado', 'Especialización', 'Maestría', 'Doctorado', 'Posdoctorado', 'Otros')),
    titulo VARCHAR(200) NOT NULL,
    programa VARCHAR(200),
    institucion VARCHAR(200),
    pais VARCHAR(100),
    anio_graduacion INTEGER CHECK (anio_graduacion IS NULL OR anio_graduacion BETWEEN 1900 AND 2200),
    formacion_complementaria TEXT,
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (docente_id, nivel_formacion, anio_graduacion)
);

-- ── Historial de escalafón docente (Decreto 1279 de 2002) ───────────
CREATE TABLE IF NOT EXISTS docente_escalafones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    nivel VARCHAR(30) NOT NULL
        CHECK (nivel IN ('Auxiliar', 'Asistente', 'Asociado', 'Titular', 'Catedrático')),
    categoria VARCHAR(50) CHECK (categoria IS NULL OR categoria IN ('1', '2', '3', '4')),
    fecha DATE NOT NULL,
    decreto_1279 VARCHAR(100),
    acto_ascenso VARCHAR(200),
    fecha_ascenso DATE,
    categoria_investigador VARCHAR(60),
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (docente_id, nivel, fecha)
);

-- ── Evaluación docente: una fila por evaluador, nunca combinada ─────
CREATE TABLE IF NOT EXISTS docente_evaluaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    anio INTEGER NOT NULL CHECK (anio BETWEEN 1900 AND 2200),
    periodo VARCHAR(20) CHECK (periodo IN ('Semestre A', 'Semestre B', 'Anual')),
    evaluador VARCHAR(30) NOT NULL
        CHECK (evaluador IN ('Estudiantes', 'Autoevaluación', 'Colegas', 'Jefes', 'Externas')),
    tipo_evaluacion VARCHAR(100),
    escala VARCHAR(20) CHECK (escala IS NULL OR escala IN ('0-5', '1-5', '1-7', '1-100')),
    resultado NUMERIC(5,2) CHECK (resultado IS NULL OR resultado >= 0),
    accion_mejora TEXT,
    observaciones TEXT,
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (docente_id, anio, periodo, evaluador)
);

-- ── Planes de mejoramiento ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS docente_planes_mejoramiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    anio INTEGER NOT NULL CHECK (anio BETWEEN 1900 AND 2200),
    periodo VARCHAR(20) CHECK (periodo IS NULL OR periodo IN ('Semestre A', 'Semestre B', 'Anual')),
    plan VARCHAR(300) NOT NULL,
    hallazgo TEXT,
    accion TEXT,
    responsable VARCHAR(150),
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
        CHECK (estado IN ('Pendiente', 'En proceso', 'Cumplido')),
    fecha_inicio DATE,
    fecha_fin DATE,
    seguimiento TEXT,
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Redes académicas (catálogo compartido, se reutiliza) ───────────
CREATE TABLE IF NOT EXISTS redes_academicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL UNIQUE,
    tipo_alcance VARCHAR(30) NOT NULL
        CHECK (tipo_alcance IN ('Institucional', 'Nacional', 'Internacional', 'Regional')),
    descripcion TEXT,
    sitio_web VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Participación de un docente en una red ──────────────────────────
CREATE TABLE IF NOT EXISTS docente_redes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id UUID NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    red_id UUID NOT NULL REFERENCES redes_academicas(id) ON DELETE CASCADE,
    anio_inicio INTEGER NOT NULL CHECK (anio_inicio BETWEEN 1900 AND 2200),
    anio_fin INTEGER CHECK (anio_fin IS NULL OR anio_fin >= anio_inicio),
    periodo VARCHAR(20) CHECK (periodo IS NULL OR periodo IN ('Semestre A', 'Semestre B', 'Anual')),
    tipo_participacion VARCHAR(30)
        CHECK (tipo_participacion IS NULL OR tipo_participacion IN ('Miembro', 'Coordinador', 'Presidente', 'Director')),
    participacion TEXT,
    impacto TEXT,
    resultados TEXT,
    enlace_referencia VARCHAR(500),
    documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (docente_id, red_id, anio_inicio)
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_docentes_numero ON docentes(numero_docente);
CREATE INDEX IF NOT EXISTS idx_docentes_nombre ON docentes(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_docentes_area ON docentes(area_enfoque);
CREATE INDEX IF NOT EXISTS idx_docentes_estado ON docentes(estado);
CREATE INDEX IF NOT EXISTS idx_docentes_usuario ON docentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vinculaciones_docente ON docente_vinculaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_vinculaciones_anio ON docente_vinculaciones(anio_vinculacion);
CREATE INDEX IF NOT EXISTS idx_formaciones_docente ON docente_formaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_formaciones_nivel ON docente_formaciones(nivel_formacion);
CREATE INDEX IF NOT EXISTS idx_escalafones_docente ON docente_escalafones(docente_id);
CREATE INDEX IF NOT EXISTS idx_escalafones_fecha ON docente_escalafones(fecha);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_docente ON docente_evaluaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_anio ON docente_evaluaciones(anio);
CREATE INDEX IF NOT EXISTS idx_mejoramientos_docente ON docente_planes_mejoramiento(docente_id);
CREATE INDEX IF NOT EXISTS idx_mejoramientos_estado ON docente_planes_mejoramiento(estado);
CREATE INDEX IF NOT EXISTS idx_redes_nombre ON redes_academicas(nombre);
CREATE INDEX IF NOT EXISTS idx_docente_redes_docente ON docente_redes(docente_id);
CREATE INDEX IF NOT EXISTS idx_docente_redes_red ON docente_redes(red_id);
CREATE INDEX IF NOT EXISTS idx_docente_documento ON docente_formaciones(documento_id);
CREATE INDEX IF NOT EXISTS idx_docente_evaluacion_documento ON docente_evaluaciones(documento_id);

-- La tabla `indicadores` no tenía restricción única, por lo que sus UPSERT no
-- podían funcionar. Se deduplican los registros preexistentes antes de crearla
-- para que la migración no falle en bases que ya tuvieran indicadores cargados.
DELETE FROM indicadores a
      USING indicadores b
      WHERE a.id > b.id
        AND a.factor_id IS NOT DISTINCT FROM b.factor_id
        AND a.nombre = b.nombre
        AND a.anio IS NOT DISTINCT FROM b.anio
        AND COALESCE(a.semestre, 'Anual') = COALESCE(b.semestre, 'Anual');

CREATE UNIQUE INDEX IF NOT EXISTS uq_indicadores_factor_nombre_anio
    ON indicadores(factor_id, nombre, anio, COALESCE(semestre, 'Anual'));

-- ============================================
-- CATÁLOGOS DEL FACTOR 3
-- ============================================
-- Se crean las características del F3 sólo si el factor existe pero no tiene
-- las suyas. En una base ya migrada con las características existentes (F3C1..F3C4)
-- esta sección no altera nada.
INSERT INTO caracteristicas (factor_id, codigo, nombre)
SELECT f.id, v.codigo, v.nombre
FROM factores f
CROSS JOIN (VALUES
  ('F3C1', 'Selección y vinculación de profesores'),
  ('F3C2', 'Estatuto profesoral'),
  ('F3C3', 'Número, dedicación y nivel de formación'),
  ('F3C4', 'Desarrollo profesoral y capacitación')
) AS v(codigo, nombre)
WHERE f.codigo = 'F3'
  AND NOT EXISTS (
    SELECT 1 FROM caracteristicas c
    WHERE c.factor_id = f.id AND c.codigo = v.codigo
  );

-- ============================================
-- VÍNCULO DOCENTE → DOCUMENTO
-- ============================================
-- La tabla `documentos` es compartida por todos los factores y no tenía
-- forma de saber a qué docente pertenece una evidencia. Se añade la
-- columna en lugar de emparejar por `responsable` con un LIKE sobre el
-- nombre: dos docentes con nombres parecidos ("Ana María Ruiz" y
-- "Ana María Ruiz-ballén") comparten coincidencias y el filtro traería
-- documentos de otro profesor.
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS docente_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documentos_docente_id_fkey'
  ) THEN
    ALTER TABLE documentos
      ADD CONSTRAINT documentos_docente_id_fkey
      FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documentos_docente
  ON documentos(docente_id) WHERE activo = TRUE;

-- ============================================
-- ADECUACIÓN AL FORMULARIO OFICIAL DEL FACTOR 3
-- ============================================
-- El formulario oficial del programa define 6 apartados. Esta sección ajusta
-- el esquema de una base ya poblada sin perder los datos válidos.

-- 1) Vinculación: era la única tabla de dominio sin evidencia documental.
ALTER TABLE docente_vinculaciones
  ADD COLUMN IF NOT EXISTS documento_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'docente_vinculaciones_documento_id_fkey'
  ) THEN
    ALTER TABLE docente_vinculaciones
      ADD CONSTRAINT docente_vinculaciones_documento_id_fkey
      FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vinculaciones_documento
  ON docente_vinculaciones(documento_id);

-- 2) Escalafón: `norma` pasa a llamarse `decreto_1279` (Decreto 1279 de 2002).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'docente_escalafones'
      AND column_name = 'norma'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'docente_escalafones'
      AND column_name = 'decreto_1279'
  ) THEN
    ALTER TABLE docente_escalafones RENAME COLUMN norma TO decreto_1279;
  END IF;
END $$;

-- 3) Evaluación: `tipo_evaluacion` era en realidad el evaluador. Se renombra a
--    `evaluador` (conserva el CHECK y el UNIQUE) y se añade `tipo_evaluacion`
--    como texto libre para la clase de evaluación.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'docente_evaluaciones'
      AND column_name = 'tipo_evaluacion'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'docente_evaluaciones'
      AND column_name = 'evaluador'
  ) THEN
    ALTER TABLE docente_evaluaciones RENAME COLUMN tipo_evaluacion TO evaluador;
  END IF;
END $$;

ALTER TABLE docente_evaluaciones
  ADD COLUMN IF NOT EXISTS tipo_evaluacion VARCHAR(100);

-- 4) Apartados eliminados del formulario: capacitaciones, planes de
--    capacitación e investigación. Se eliminan de forma intencional.
DROP TABLE IF EXISTS docente_capacitaciones CASCADE;
DROP TABLE IF EXISTS docente_planes_capacitacion CASCADE;
DROP TABLE IF EXISTS docente_investigaciones CASCADE;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
\echo 'Migración del módulo Docentes aplicada correctamente.'
