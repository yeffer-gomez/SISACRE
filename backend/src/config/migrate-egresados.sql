-- ============================================================
-- Migración del módulo Egresados (Factor 4)
--
-- Es idempotente: puede aplicarse varias veces sin perder datos.
-- En una base ya inicializada, las tablas se crean solo si no existen.
--
-- Para aplicar en una base viva (contenedor PostgreSQL):
--   Get-Content backend/src/config/migrate-egresados.sql -Raw |
--     docker exec -i sisacre_db psql -U sisacre_user -d sisacre_db
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- ============================================================
-- ÍNDICES
-- ============================================================
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

-- ============================================================
-- CATÁLOGO DEL FACTOR 4
-- ============================================================
-- Se agregan las características del F4 (Egresados) si aún no existen.
-- El factor F4 ya viene sembrado por init.sql.
INSERT INTO caracteristicas (factor_id, codigo, nombre)
SELECT f.id, v.codigo, v.nombre
FROM factores f
CROSS JOIN (VALUES
  ('F4C1', 'Información y caracterización de los egresados'),
  ('F4C2', 'Vinculación de los egresados con el programa'),
  ('F4C3', 'Seguimiento al proceso de grado'),
  ('F4C4', 'Reconocimientos, distinciones y logros'),
  ('F4C5', 'Formación continua y políticas de egresados')
) AS v(codigo, nombre)
WHERE f.codigo = 'F4'
  AND NOT EXISTS (
    SELECT 1 FROM caracteristicas c
    WHERE c.factor_id = f.id AND c.codigo = v.codigo
  );

-- ============================================================
-- Fin de la migración
-- ============================================================
