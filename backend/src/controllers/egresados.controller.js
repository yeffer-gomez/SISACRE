const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================
// Catálogos del módulo Egresados (Factor 4)
// Sus valores coinciden con los CHECK de init.sql / migrate-egresados.sql.
// El frontend los consume para armar los <select>.
// ============================================================
const OPCIONES = {
  SI_NO: ['Sí', 'No'],
  ESTADOS_VINCULACION: ['Activo', 'Inactivo'],
  SERVICIOS_BIENESTAR: [
    'Becas de Alimentación',
    'Auxilio de Arrendamiento',
    'Fondo de Solidaridad',
    'Tutorías Y Monitorias',
    'Área de Salud',
    'Actividades Culturales',
    'Deportes',
  ],
};

const CAMPOS_EDITABLES = [
  'nombre_completo', 'cedula', 'titulacion', 'anio_graduacion',
  'telefono', 'correo', 'observaciones',
];

// ============================================================
// GET /api/egresados
// ============================================================
const listar = async (req, res) => {
  try {
    const { page = 1, limit = 20, anio, busqueda } = req.query;
    const limite = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const pagina = Math.max(parseInt(page, 10) || 1, 1);

    const condiciones = ['e.activo = TRUE'];
    const params = [];
    const anadir = (valor) => {
      params.push(valor);
      return `$${params.length}`;
    };

    if (anio) condiciones.push(`e.anio_graduacion = ${anadir(Number(anio))}`);
    if (busqueda) {
      const p = anadir(`%${busqueda}%`);
      condiciones.push(`(e.nombre_completo ILIKE ${p} OR e.cedula ILIKE ${p} OR e.titulacion ILIKE ${p})`);
    }
    const where = `WHERE ${condiciones.join(' AND ')}`;

    const total = await pool.query(`SELECT COUNT(*)::int AS total FROM egresados e ${where}`, params);

    const paramsPagina = [...params, limite, (pagina - 1) * limite];
    const result = await pool.query(
      `SELECT e.*,
              (SELECT COUNT(*)::int FROM egresado_grupos_investigacion g WHERE g.egresado_id = e.id AND g.activo = TRUE) AS total_grupos,
              (SELECT COUNT(*)::int FROM egresado_posgrados p WHERE p.egresado_id = e.id AND p.activo = TRUE) AS total_posgrados,
              (SELECT COUNT(*)::int FROM egresado_bienestar b WHERE b.egresado_id = e.id AND b.activo = TRUE) AS total_bienestar,
              (SELECT COUNT(*)::int FROM egresado_seguimiento_grado s WHERE s.egresado_id = e.id AND s.activo = TRUE) AS total_seguimiento,
              (SELECT COUNT(*)::int FROM egresado_reconocimientos r WHERE r.egresado_id = e.id AND r.activo = TRUE) AS total_reconocimientos
       FROM egresados e ${where}
       ORDER BY e.nombre_completo
       LIMIT $${paramsPagina.length - 1} OFFSET $${paramsPagina.length}`,
      paramsPagina
    );

    const totalDocs = total.rows[0].total;
    res.json({
      data: result.rows,
      total: totalDocs,
      page: pagina,
      limit: limite,
      totalPaginas: Math.ceil(totalDocs / limite),
    });
  } catch (error) {
    console.error('Error al listar egresados:', error);
    res.status(500).json({ message: 'Error al obtener egresados' });
  }
};

// ============================================================
// GET /api/egresados/opciones
// ============================================================
const opciones = async (req, res) => {
  try {
    const anios = await pool.query(
      'SELECT DISTINCT anio_graduacion AS valor FROM egresados WHERE activo = TRUE AND anio_graduacion IS NOT NULL ORDER BY 1 DESC'
    );
    const titulaciones = await pool.query(
      "SELECT DISTINCT titulacion AS valor FROM egresados WHERE activo = TRUE AND titulacion IS NOT NULL AND titulacion <> '' ORDER BY 1"
    );
    res.json({
      ...OPCIONES,
      ANIOS: anios.rows.map((r) => r.valor),
      TITULACIONES: titulaciones.rows.map((r) => r.valor),
    });
  } catch (error) {
    console.error('Error al obtener opciones de egresados:', error);
    res.status(500).json({ message: 'Error al obtener catálogos de egresados' });
  }
};

// ============================================================
// GET /api/egresados/:id
// ============================================================
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM egresados WHERE id = $1 AND activo = TRUE',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Egresado no encontrado' });

    const conteos = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM egresado_grupos_investigacion WHERE egresado_id = $1 AND activo = TRUE) AS grupos,
         (SELECT COUNT(*)::int FROM egresado_posgrados WHERE egresado_id = $1 AND activo = TRUE) AS posgrados,
         (SELECT COUNT(*)::int FROM egresado_bienestar WHERE egresado_id = $1 AND activo = TRUE) AS bienestar,
         (SELECT COUNT(*)::int FROM egresado_seguimiento_grado WHERE egresado_id = $1 AND activo = TRUE) AS seguimiento_grado,
         (SELECT COUNT(*)::int FROM egresado_reconocimientos WHERE egresado_id = $1 AND activo = TRUE) AS reconocimientos`,
      [id]
    );

    res.json({ ...result.rows[0], conteos: conteos.rows[0] });
  } catch (error) {
    console.error('Error al obtener egresado:', error);
    res.status(500).json({ message: 'Error al obtener egresado' });
  }
};

// ============================================================
// POST /api/egresados
// ============================================================
const crear = async (req, res) => {
  try {
    const { nombre_completo, cedula, titulacion, anio_graduacion, telefono, correo, observaciones } = req.body;

    if (!nombre_completo || !String(nombre_completo).trim()) {
      return res.status(400).json({ message: 'El nombre completo es obligatorio' });
    }
    if (!cedula || !String(cedula).trim()) {
      return res.status(400).json({ message: 'La cédula es obligatoria' });
    }

    const result = await pool.query(
      `INSERT INTO egresados (
         nombre_completo, cedula, titulacion, anio_graduacion, telefono, correo, observaciones
       ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        String(nombre_completo).trim(), String(cedula).trim(), titulacion || null,
        anio_graduacion || null, telefono || null, correo || null, observaciones || null,
      ]
    );

    res.status(201).json({ message: 'Egresado creado exitosamente', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe un egresado con esa cédula' });
    if (error.code === '23514') return res.status(400).json({ message: 'Alguno de los valores enviados no es válido' });
    console.error('Error al crear egresado:', error);
    res.status(500).json({ message: 'Error al crear egresado' });
  }
};

// ============================================================
// PUT /api/egresados/:id
// ============================================================
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;

    const asignaciones = [];
    const valores = [];
    for (const campo of CAMPOS_EDITABLES) {
      if (!(campo in req.body)) continue;
      let valor = req.body[campo];
      if (typeof valor === 'string') valor = valor.trim();
      if (valor === '') valor = null;
      valores.push(valor);
      asignaciones.push(`${campo} = $${valores.length}`);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({ message: 'No se envió ningún campo para actualizar' });
    }
    if ('nombre_completo' in req.body && !req.body.nombre_completo) {
      return res.status(400).json({ message: 'El nombre completo no puede quedar vacío' });
    }
    if ('cedula' in req.body && !req.body.cedula) {
      return res.status(400).json({ message: 'La cédula no puede quedar vacía' });
    }

    valores.push(id);
    const result = await pool.query(
      `UPDATE egresados SET ${asignaciones.join(', ')}, updated_at = NOW()
        WHERE id = $${valores.length} AND activo = TRUE RETURNING id`,
      valores
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Egresado no encontrado' });
    res.json({ message: 'Egresado actualizado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe un egresado con esa cédula' });
    if (error.code === '23514') return res.status(400).json({ message: 'Alguno de los valores enviados no es válido' });
    console.error('Error al actualizar egresado:', error);
    res.status(500).json({ message: 'Error al actualizar egresado' });
  }
};

// ============================================================
// DELETE /api/egresados/:id
// Eliminación lógica: el histórico de sus tablas hijas se conserva.
// ============================================================
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE egresados SET activo = FALSE, updated_at = NOW() WHERE id = $1 AND activo = TRUE RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Egresado no encontrado' });
    res.json({ message: 'Egresado eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar egresado:', error);
    res.status(500).json({ message: 'Error al eliminar egresado' });
  }
};

// ============================================================
// GET /api/egresados/estadisticas
// Agregados calculados sobre las tablas reales del Factor 4.
// Admite los mismos filtros de caracterización del listado.
// ============================================================
const estadisticas = async (req, res) => {
  try {
    const { anio, titulacion } = req.query;

    // El universo son los egresados que pasan los filtros de caracterización.
    // Las tablas hijas se agregan restringidas a ese universo por `egresado_id`.
    const params = [];
    const filtrosSql = ['e.activo = TRUE'];
    if (anio) {
      params.push(Number(anio));
      filtrosSql.push(`e.anio_graduacion = $${params.length}`);
    }
    if (titulacion) {
      params.push(titulacion);
      filtrosSql.push(`e.titulacion = $${params.length}`);
    }
    const where = filtrosSql.join(' AND ');
    const universo = `SELECT e.id FROM egresados e WHERE ${where}`;

    const [
      totales, porAnio, porTitulacion,
      gruposPorEstado, gruposTop, gruposVinculados,
      posgradosPorEstado, posgradosTop, posgradosVinculados,
      bienestar, seguimiento, reconocimientosPorTipo, reconocimientosPorAnio,
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM egresado_grupos_investigacion g WHERE g.egresado_id = e.id AND g.activo = TRUE))::int AS con_grupo,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM egresado_posgrados p WHERE p.egresado_id = e.id AND p.activo = TRUE))::int AS con_posgrado,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM egresado_bienestar b WHERE b.egresado_id = e.id AND b.activo = TRUE))::int AS con_bienestar,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM egresado_seguimiento_grado s WHERE s.egresado_id = e.id AND s.activo = TRUE))::int AS con_seguimiento,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM egresado_reconocimientos r WHERE r.egresado_id = e.id AND r.activo = TRUE))::int AS con_reconocimiento
         FROM egresados e WHERE ${where}`,
        params
      ),
      pool.query(
        `SELECT e.anio_graduacion AS anio, COUNT(*)::int AS total
         FROM egresados e WHERE ${where} AND e.anio_graduacion IS NOT NULL
         GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(e.titulacion, ''), 'Sin titulación registrada') AS etiqueta, COUNT(*)::int AS total
         FROM egresados e WHERE ${where}
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT COALESCE(g.estado, 'Sin estado') AS etiqueta, COUNT(*)::int AS total
         FROM egresado_grupos_investigacion g
         WHERE g.activo = TRUE AND g.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(g.nombre_grupo, ''), 'Sin nombre') AS etiqueta, COUNT(DISTINCT g.egresado_id)::int AS total
         FROM egresado_grupos_investigacion g
         WHERE g.activo = TRUE AND g.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC LIMIT 10`,
        params
      ),
      pool.query(
        `SELECT COUNT(DISTINCT g.egresado_id) FILTER (WHERE g.vinculado = 'Sí')::int AS vinculados,
                COUNT(DISTINCT g.egresado_id) FILTER (WHERE g.vinculado = 'No')::int AS no_vinculados,
                COUNT(*)::int AS total
         FROM egresado_grupos_investigacion g
         WHERE g.activo = TRUE AND g.egresado_id IN (${universo})`,
        params
      ),
      pool.query(
        `SELECT COALESCE(p.estado, 'Sin estado') AS etiqueta, COUNT(*)::int AS total
         FROM egresado_posgrados p
         WHERE p.activo = TRUE AND p.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(p.nombre_posgrado, ''), 'Sin nombre') AS etiqueta, COUNT(DISTINCT p.egresado_id)::int AS total
         FROM egresado_posgrados p
         WHERE p.activo = TRUE AND p.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC LIMIT 10`,
        params
      ),
      pool.query(
        `SELECT COUNT(DISTINCT p.egresado_id) FILTER (WHERE p.vinculado = 'Sí')::int AS vinculados,
                COUNT(DISTINCT p.egresado_id) FILTER (WHERE p.vinculado = 'No')::int AS no_vinculados,
                COUNT(*)::int AS total
         FROM egresado_posgrados p
         WHERE p.activo = TRUE AND p.egresado_id IN (${universo})`,
        params
      ),
      pool.query(
        `SELECT b.servicio AS etiqueta, COUNT(*)::int AS total, COUNT(DISTINCT b.egresado_id)::int AS egresados
         FROM egresado_bienestar b
         WHERE b.activo = TRUE AND b.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(s.tiempo_transcurrido, ''), 'Sin registro') AS etiqueta, COUNT(*)::int AS total
         FROM egresado_seguimiento_grado s
         WHERE s.activo = TRUE AND s.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(r.tipo_reconocimiento, ''), 'Sin tipo') AS etiqueta, COUNT(*)::int AS total
         FROM egresado_reconocimientos r
         WHERE r.activo = TRUE AND r.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT r.anio_entrega AS anio, COUNT(*)::int AS total
         FROM egresado_reconocimientos r
         WHERE r.activo = TRUE AND r.anio_entrega IS NOT NULL AND r.egresado_id IN (${universo})
         GROUP BY 1 ORDER BY 1`,
        params
      ),
    ]);

    const suma = (filas) => filas.reduce((acc, f) => acc + f.total, 0);

    res.json({
      filtros: { anio: anio ? Number(anio) : null, titulacion: titulacion || null },
      totales: totales.rows[0],
      porAnio: porAnio.rows,
      porTitulacion: porTitulacion.rows,
      grupos: { ...gruposVinculados.rows[0], porEstado: gruposPorEstado.rows, top: gruposTop.rows },
      posgrados: { ...posgradosVinculados.rows[0], porEstado: posgradosPorEstado.rows, top: posgradosTop.rows },
      bienestar: { total: suma(bienestar.rows), porServicio: bienestar.rows },
      seguimiento: { total: suma(seguimiento.rows), porTiempo: seguimiento.rows },
      reconocimientos: {
        total: suma(reconocimientosPorTipo.rows),
        porTipo: reconocimientosPorTipo.rows,
        porAnio: reconocimientosPorAnio.rows,
      },
    });
  } catch (error) {
    console.error('Error en estadísticas de egresados:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de egresados' });
  }
};

module.exports = { OPCIONES, listar, opciones, obtener, crear, actualizar, eliminar, estadisticas };
