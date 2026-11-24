-- ============================================
-- SISACRE - Base de Datos
-- Sistema de Acreditación - Psicología UDENAR
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: roles
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuario_roles
-- ============================================
CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- ============================================
-- TABLA: factores
-- ============================================
CREATE TABLE IF NOT EXISTS factores (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: caracteristicas
-- ============================================
CREATE TABLE IF NOT EXISTS caracteristicas (
    id SERIAL PRIMARY KEY,
    factor_id INTEGER REFERENCES factores(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: tipos_evidencia
-- ============================================
CREATE TABLE IF NOT EXISTS tipos_evidencia (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: documentos
-- ============================================
CREATE TABLE IF NOT EXISTS documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT,
    factor_id INTEGER REFERENCES factores(id),
    caracteristica_id INTEGER REFERENCES caracteristicas(id),
    tipo_evidencia_id INTEGER REFERENCES tipos_evidencia(id),
    anio INTEGER NOT NULL,
    semestre VARCHAR(10) CHECK (semestre IN ('A', 'B', 'Anual')),
    responsable VARCHAR(150),
    subido_por UUID REFERENCES usuarios(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: versiones_documento
-- ============================================
CREATE TABLE IF NOT EXISTS versiones_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    version_numero INTEGER NOT NULL,
    nombre_archivo VARCHAR(300) NOT NULL,
    nombre_original VARCHAR(300) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100),
    tamanio_bytes BIGINT,
    es_version_actual BOOLEAN DEFAULT FALSE,
    subido_por UUID REFERENCES usuarios(id),
    notas_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: indicadores
-- ============================================
CREATE TABLE IF NOT EXISTS indicadores (
    id SERIAL PRIMARY KEY,
    factor_id INTEGER REFERENCES factores(id),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    valor_meta NUMERIC(10,2),
    valor_actual NUMERIC(10,2),
    unidad VARCHAR(50),
    anio INTEGER,
    semestre VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: proyectos_investigacion
-- ============================================
CREATE TABLE IF NOT EXISTS proyectos_investigacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(300) NOT NULL,
    anio_publicacion INTEGER NOT NULL,
    semestre VARCHAR(2) CHECK (semestre IN ('A', 'B')),
    duracion VARCHAR(100),
    tipo_producto VARCHAR(50) CHECK (tipo_producto IN ('Artículo','Libro','Revista','Informe','Capítulo de libro','Otros')),
    objetivo TEXT,
    resumen TEXT,
    resultado_proyecto TEXT,
    fecha_inicio DATE,
    tipo_proyecto VARCHAR(100) CHECK (tipo_proyecto IN (
        'Investigación','Innovación',
        'Servicios de recolección de datos científicos',
        'Servicios de información',
        'Servicios de estudios para la planeación y formulación de políticas',
        'Servicios de estudio de factibilidad o viabilidad',
        'Servicios de ensayos, normalización, metodología y control de calidad',
        'Otros servicios'
    )),
    objeto_socioeconomico VARCHAR(150) CHECK (objeto_socioeconomico IN (
        'Protección y mejora de la salud humana',
        'Desarrollo de la agricultura, ganadería, silvicultura y pesca',
        'Desarrollo industrial',
        'Producción y tecnología de la energía',
        'Protección y mejora del medio ambiente',
        'Exploración y explotación del espacio',
        'Sistemas y estructuras sociales',
        'Investigación no orientada',
        'Otras investigaciones civiles'
    )),
    link_iisn VARCHAR(500),
    financiado_viis VARCHAR(2) CHECK (financiado_viis IN ('Si', 'No')),
    codigo_proyecto VARCHAR(100),
    registrado_por UUID REFERENCES usuarios(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proyectos_anio ON proyectos_investigacion(anio_publicacion);
CREATE INDEX IF NOT EXISTS idx_proyectos_tipo ON proyectos_investigacion(tipo_proyecto);

-- ============================================
-- MÓDULO DOCENTES — Factor 3: Profesores
-- ============================================
-- Criterio de diseño:
--   * `docentes` guarda solo identidad y atributos vigentes NO históricos.
--   * Todo lo que tiene fecha o periodo (vinculación, escalafón, evaluación,
--     capacitación,etc.) vive en su propia tabla hija y NUNCA se sobrescribe:
--     se inserta un registro nuevo y el histórico queda intacto.
--   * El valor "actual" (tipo de vinculación, categoría de escalafón) se resuelve
--     en tiempo de consulta con LATERAL sobre el registro vigente más reciente,
--     de modo que no exista una segunda fuente de verdad que pueda desincronizarse.
--   * Las evidencias se enlazan por `documento_id` → tabla `documentos` ya
--     existente (factor / característica / año / semestre / tipo_evidencia),
--     reutilizando el sistema de versiones, Multer y uploads sin romperlo.

-- ── Entidad principal: docente ──────────────────────────────────────
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
    -- Vincula la cuenta de acceso del SISACRE con el registro del docente,
    -- para que un usuario con rol `docente` consulte únicamente su ficha.
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unicidad PARCIAL: solo entre docentes activos. Con un UNIQUE normal un
-- docente eliminado lýmicamente seguiría ocupando su número y su cuenta
-- de usuario, de modo que no podría reingresarse ni revincularse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_docentes_numero_activo
    ON docentes(numero_docente) WHERE activo = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_docentes_usuario_activo
    ON docentes(usuario_id) WHERE activo = TRUE AND usuario_id IS NOT NULL;

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
    -- No se admiten dos vinculaciones del mismo tipo en el mismo año.
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
    -- Un mismo nivel no se registra dos veces en el mismo año.
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
    -- `evaluador` = quién evalúa; `tipo_evaluacion` = clase de evaluación.
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
    -- Clave del requisito "NO combinar resultados en un único registro".
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
-- MÓDULO EGRESADOS (Factor 4)
-- ============================================

-- ── Entidad principal: egresado (Información general) ───────────────
CREATE TABLE IF NOT EXISTS egresados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(200) NOT NULL,
    cedula VARCHAR(30) NOT NULL,
    titulacion VARCHAR(200),
    anio_graduacion INTEGER CHECK (anio_graduacion IS NULL OR anio_graduacion BETWEEN 1900 AND 2200),
    telefono VARCHAR(30),
    correo VARCHAR(150),
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Vinculación a grupos de investigación ───────────────────────────
CREATE TABLE IF NOT EXISTS egresado_grupos_investigacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egresado_id UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    vinculado VARCHAR(2) NOT NULL DEFAULT 'No' CHECK (vinculado IN ('Sí', 'No')),
    nombre_grupo VARCHAR(200),
    anio INTEGER CHECK (anio IS NULL OR anio BETWEEN 1900 AND 2200),
    estado VARCHAR(20) CHECK (estado IS NULL OR estado IN ('Activo', 'Inactivo')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Vinculación a posgrados ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS egresado_posgrados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egresado_id UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    vinculado VARCHAR(2) NOT NULL DEFAULT 'No' CHECK (vinculado IN ('Sí', 'No')),
    nombre_posgrado VARCHAR(200),
    anio INTEGER CHECK (anio IS NULL OR anio BETWEEN 1900 AND 2200),
    estado VARCHAR(20) CHECK (estado IS NULL OR estado IN ('Activo', 'Inactivo')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Servicios de bienestar utilizados (una fila por servicio) ───────
CREATE TABLE IF NOT EXISTS egresado_bienestar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egresado_id UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    servicio VARCHAR(100) NOT NULL
        CHECK (servicio IN ('Becas de Alimentación', 'Auxilio de Arrendamiento', 'Fondo de Solidaridad',
                            'Tutorías Y Monitorias', 'Área de Salud', 'Actividades Culturales', 'Deportes')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Seguimiento al proceso de grado ─────────────────────────────────
CREATE TABLE IF NOT EXISTS egresado_seguimiento_grado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egresado_id UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    fecha_egreso DATE,
    tiempo_transcurrido VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Reconocimientos, distinciones y logros ──────────────────────────
CREATE TABLE IF NOT EXISTS egresado_reconocimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egresado_id UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    tipo_reconocimiento VARCHAR(150),
    anio_entrega INTEGER CHECK (anio_entrega IS NULL OR anio_entrega BETWEEN 1900 AND 2200),
    nombre_reconocimiento VARCHAR(200),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Políticas en torno a egresados (catálogo global) ────────────────
CREATE TABLE IF NOT EXISTS politicas_egresados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    objeto TEXT,
    link VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Formación continua (programa + participante en cada fila) ───────
CREATE TABLE IF NOT EXISTS formacion_continua (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_programa VARCHAR(200) NOT NULL,
    tipo_programa VARCHAR(100),
    fecha DATE,
    participante_identificacion VARCHAR(30),
    participante_nombre VARCHAR(200),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documentos_factor ON documentos(factor_id);
CREATE INDEX IF NOT EXISTS idx_documentos_anio ON documentos(anio);
CREATE INDEX IF NOT EXISTS idx_documentos_subido_por ON documentos(subido_por);
CREATE INDEX IF NOT EXISTS idx_versiones_documento ON versiones_documento(documento_id);
CREATE INDEX IF NOT EXISTS idx_caracteristicas_factor ON caracteristicas(factor_id);

-- Índices del módulo Docentes (Factor 3)
CREATE INDEX IF NOT EXISTS idx_docentes_numero ON docentes(numero_docente);
CREATE INDEX IF NOT EXISTS idx_docentes_nombre ON docentes(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_docentes_area ON docentes(area_enfoque);
CREATE INDEX IF NOT EXISTS idx_docentes_estado ON docentes(estado);
CREATE INDEX IF NOT EXISTS idx_docentes_usuario ON docentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vinculaciones_docente ON docente_vinculaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_vinculaciones_anio ON docente_vinculaciones(anio_vinculacion);
CREATE INDEX IF NOT EXISTS idx_vinculaciones_documento ON docente_vinculaciones(documento_id);
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

-- Índices del módulo Egresados (Factor 4)
CREATE UNIQUE INDEX IF NOT EXISTS uq_egresados_cedula_activo
    ON egresados(cedula) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_egresados_nombre ON egresados(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_egresados_anio ON egresados(anio_graduacion);
CREATE INDEX IF NOT EXISTS idx_egresado_grupos_egresado ON egresado_grupos_investigacion(egresado_id);
CREATE INDEX IF NOT EXISTS idx_egresado_posgrados_egresado ON egresado_posgrados(egresado_id);
CREATE INDEX IF NOT EXISTS idx_egresado_bienestar_egresado ON egresado_bienestar(egresado_id);
CREATE INDEX IF NOT EXISTS idx_egresado_seguimiento_egresado ON egresado_seguimiento_grado(egresado_id);
CREATE INDEX IF NOT EXISTS idx_egresado_reconocimientos_egresado ON egresado_reconocimientos(egresado_id);
CREATE INDEX IF NOT EXISTS idx_politicas_egresados_nombre ON politicas_egresados(nombre);
CREATE INDEX IF NOT EXISTS idx_formacion_continua_programa ON formacion_continua(nombre_programa);

-- `documentos` es compartida por todos los factores y no registraba a qué
-- docente pertenecía una evidencia. Se añade la columna en vez de emparejar
-- por `responsable` con un LIKE sobre el nombre, que mezclaría evidencias
-- de docentes con nombres parecidos.
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS docente_id UUID REFERENCES docentes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_docente ON documentos(docente_id) WHERE activo = TRUE;

-- La tabla `indicadores` no tenía restricción única, por lo que sus
-- UPSERT no podían funcionar. Se añade para reutilizarla en el Factor 3.
CREATE UNIQUE INDEX IF NOT EXISTS uq_indicadores_factor_nombre_anio
    ON indicadores(factor_id, nombre, anio, COALESCE(semestre, 'Anual'));

-- ============================================
-- DATOS SEMILLA
-- ============================================

-- Roles
INSERT INTO roles (nombre, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('coordinador', 'Gestiona factores y documentos del programa'),
('evaluador', 'Consulta y evalúa evidencias'),
('docente', 'Carga documentos de su responsabilidad')
ON CONFLICT (nombre) DO NOTHING;

-- Tipos de evidencia
INSERT INTO tipos_evidencia (nombre, descripcion) VALUES
('Acta', 'Actas de reuniones, comités o consejos'),
('Informe', 'Informes de gestión o actividades'),
('Certificado', 'Certificados y constancias'),
('Resolución', 'Resoluciones institucionales'),
('Plan', 'Planes de acción o mejoramiento'),
('Estadística', 'Datos estadísticos e indicadores'),
('Reglamento', 'Reglamentos y normativas'),
('Convenio', 'Convenios y acuerdos'),
('Publicación', 'Artículos, libros y publicaciones'),
('Otro', 'Otros tipos de evidencias')
ON CONFLICT (nombre) DO NOTHING;

-- Factores de acreditación (Modelo 2024)
INSERT INTO factores (codigo, nombre, descripcion) VALUES
('F1',  'Proyecto Educativo del Programa e Identidad Institucional',
        'Coherencia del programa con el proyecto educativo institucional y su identidad'),
('F2',  'Estudiantes',
        'Condiciones de admisión, permanencia y participación de los estudiantes'),
('F3',  'Profesores',
        'Planta docente, cualificación, dedicación y desarrollo profesoral'),
('F4',  'Egresados',
        'Seguimiento, impacto y vinculación de los egresados del programa'),
('F5',  'Aspectos Académicos y Resultados de Aprendizaje',
        'Currículo, metodologías, evaluación y resultados de aprendizaje'),
('F6',  'Permanencia y Graduación',
        'Estrategias de retención, acompañamiento y tasas de graduación'),
('F7',  'Interacción con el Entorno Nacional e Internacional',
        'Relaciones con comunidades académicas nacionales e internacionales'),
('F8',  'Aportes de la Investigación, Innovación y Desarrollo',
        'Actividades de investigación, semilleros y producción académica'),
('F9',  'Bienestar de la Comunidad Académica',
        'Servicios de bienestar para estudiantes, docentes y administrativos'),
('F10', 'Medios Educativos y Ambientes de Aprendizaje',
        'Recursos bibliográficos, tecnológicos y espacios de aprendizaje'),
('F11', 'Organización, Administración y Financiación',
        'Estructura administrativa, gestión y recursos financieros del programa'),
('F12', 'Recursos Físicos y Tecnológicos',
        'Infraestructura física, equipos y recursos tecnológicos disponibles')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion;

-- Características del F2 - Estudiantes
INSERT INTO caracteristicas (factor_id, codigo, nombre) VALUES
(2, 'F2C1', 'Mecanismos de ingreso'),
(2, 'F2C2', 'Número y calidad de los estudiantes admitidos'),
(2, 'F2C3', 'Participación en actividades académicas'),
(2, 'F2C4', 'Reglamento estudiantil')
ON CONFLICT DO NOTHING;

-- Características del F3 - Profesores
INSERT INTO caracteristicas (factor_id, codigo, nombre) VALUES
(3, 'F3C1', 'Selección y vinculación de profesores'),
(3, 'F3C2', 'Estatuto profesoral'),
(3, 'F3C3', 'Número, dedicación y nivel de formación'),
(3, 'F3C4', 'Desarrollo profesoral y capacitación')
ON CONFLICT DO NOTHING;

-- Características del F4 - Egresados
INSERT INTO caracteristicas (factor_id, codigo, nombre) VALUES
(4, 'F4C1', 'Información y caracterización de los egresados'),
(4, 'F4C2', 'Vinculación de los egresados con el programa'),
(4, 'F4C3', 'Seguimiento al proceso de grado'),
(4, 'F4C4', 'Reconocimientos, distinciones y logros'),
(4, 'F4C5', 'Formación continua y políticas de egresados')
ON CONFLICT DO NOTHING;

-- Características del F5 - Aspectos Académicos
INSERT INTO caracteristicas (factor_id, codigo, nombre) VALUES
(5, 'F5C1', 'Plan de estudios y estructura curricular'),
(5, 'F5C2', 'Metodologías de enseñanza y aprendizaje'),
(5, 'F5C3', 'Sistema de evaluación de estudiantes'),
(5, 'F5C4', 'Resultados de aprendizaje por competencias')
ON CONFLICT DO NOTHING;

-- Características del F8 - Investigación
INSERT INTO caracteristicas (factor_id, codigo, nombre) VALUES
(8, 'F8C1', 'Grupos y semilleros de investigación'),
(8, 'F8C2', 'Producción académica y publicaciones'),
(8, 'F8C3', 'Proyectos de investigación financiados'),
(8, 'F8C4', 'Innovación y transferencia de conocimiento')
ON CONFLICT DO NOTHING;

-- NOTA: El usuario administrador se crea automáticamente
-- por el script seed.js al iniciar el backend por primera vez.
-- Credenciales: admin@udenar.edu.co / Admin@2024
