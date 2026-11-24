const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const TIPOS_PRODUCTO = ['Artículo','Libro','Revista','Informe','Capítulo de libro','Otros'];

const TIPOS_PROYECTO = [
  'Investigación','Innovación',
  'Servicios de recolección de datos científicos',
  'Servicios de información',
  'Servicios de estudios para la planeación y formulación de políticas',
  'Servicios de estudio de factibilidad o viabilidad',
  'Servicios de ensayos, normalización, metodología y control de calidad',
  'Otros servicios',
];

const OBJETOS_SOCIOECONOMICOS = [
  'Protección y mejora de la salud humana',
  'Desarrollo de la agricultura, ganadería, silvicultura y pesca',
  'Desarrollo industrial',
  'Producción y tecnología de la energía',
  'Protección y mejora del medio ambiente',
  'Exploración y explotación del espacio',
  'Sistemas y estructuras sociales',
  'Investigación no orientada',
  'Otras investigaciones civiles',
];

// GET /api/proyectos
const listar = async (req, res) => {
  try {
    const { anio, semestre, tipo_proyecto, tipo_producto, busqueda, page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['p.activo = TRUE'];

    if (anio) { params.push(anio); conditions.push(`p.anio_publicacion = $${params.length}`); }
    if (semestre) { params.push(semestre); conditions.push(`p.semestre = $${params.length}`); }
    if (tipo_proyecto) { params.push(tipo_proyecto); conditions.push(`p.tipo_proyecto = $${params.length}`); }
    if (tipo_producto) { params.push(tipo_producto); conditions.push(`p.tipo_producto = $${params.length}`); }
    if (busqueda) {
      params.push(`%${busqueda}%`);
      conditions.push(`(p.nombre ILIKE $${params.length} OR p.objetivo ILIKE $${params.length} OR p.codigo_proyecto ILIKE $${params.length})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM proyectos_investigacion p ${where}`, params);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, u.nombre as registrado_por_nombre
       FROM proyectos_investigacion p
       LEFT JOIN usuarios u ON p.registrado_por = u.id
       ${where}
       ORDER BY p.anio_publicacion DESC, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPaginas: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    console.error('Error al listar proyectos:', error);
    res.status(500).json({ message: 'Error al obtener proyectos' });
  }
};

// GET /api/proyectos/:id
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, u.nombre as registrado_por_nombre
       FROM proyectos_investigacion p
       LEFT JOIN usuarios u ON p.registrado_por = u.id
       WHERE p.id = $1 AND p.activo = TRUE`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({ message: 'Error al obtener proyecto' });
  }
};

// POST /api/proyectos
const crear = async (req, res) => {
  try {
    const {
      nombre, anio_publicacion, semestre, duracion, tipo_producto,
      objetivo, resumen, resultado_proyecto, fecha_inicio, tipo_proyecto,
      objeto_socioeconomico, link_iisn, financiado_viis, codigo_proyecto
    } = req.body;

    if (!nombre) return res.status(400).json({ message: 'El nombre del proyecto es obligatorio' });
    if (!anio_publicacion) return res.status(400).json({ message: 'El año de publicación es obligatorio' });

    const result = await pool.query(
      `INSERT INTO proyectos_investigacion (
         nombre, anio_publicacion, semestre, duracion, tipo_producto,
         objetivo, resumen, resultado_proyecto, fecha_inicio, tipo_proyecto,
         objeto_socioeconomico, link_iisn, financiado_viis, codigo_proyecto, registrado_por
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        nombre, anio_publicacion, semestre || null, duracion || null, tipo_producto || null,
        objetivo || null, resumen || null, resultado_proyecto || null,
        fecha_inicio || null, tipo_proyecto || null,
        objeto_socioeconomico || null, link_iisn || null,
        financiado_viis || null, codigo_proyecto || null, req.user.id
      ]
    );

    res.status(201).json({ message: 'Proyecto creado exitosamente', id: result.rows[0].id });
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ message: 'Error al crear proyecto' });
  }
};

// PUT /api/proyectos/:id
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, anio_publicacion, semestre, duracion, tipo_producto,
      objetivo, resumen, resultado_proyecto, fecha_inicio, tipo_proyecto,
      objeto_socioeconomico, link_iisn, financiado_viis, codigo_proyecto
    } = req.body;

    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const result = await pool.query(
      `UPDATE proyectos_investigacion SET
         nombre=$1, anio_publicacion=$2, semestre=$3, duracion=$4, tipo_producto=$5,
         objetivo=$6, resumen=$7, resultado_proyecto=$8, fecha_inicio=$9,
         tipo_proyecto=$10, objeto_socioeconomico=$11, link_iisn=$12,
         financiado_viis=$13, codigo_proyecto=$14, updated_at=NOW()
       WHERE id=$15 AND activo=TRUE RETURNING id`,
      [
        nombre, anio_publicacion, semestre || null, duracion || null, tipo_producto || null,
        objetivo || null, resumen || null, resultado_proyecto || null,
        fecha_inicio || null, tipo_proyecto || null,
        objeto_socioeconomico || null, link_iisn || null,
        financiado_viis || null, codigo_proyecto || null, id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.json({ message: 'Proyecto actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  }
};

// DELETE /api/proyectos/:id
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE proyectos_investigacion SET activo=FALSE, updated_at=NOW() WHERE id=$1 AND activo=TRUE RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ message: 'Error al eliminar proyecto' });
  }
};

// GET /api/proyectos/opciones — catálogos para los selects
const opciones = async (req, res) => {
  res.json({ TIPOS_PRODUCTO, TIPOS_PROYECTO, OBJETOS_SOCIOECONOMICOS });
};

// GET /api/proyectos/estadisticas
const estadisticas = async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM proyectos_investigacion WHERE activo=TRUE');
    const porTipo = await pool.query(
      `SELECT tipo_proyecto, COUNT(*) as total
       FROM proyectos_investigacion WHERE activo=TRUE AND tipo_proyecto IS NOT NULL
       GROUP BY tipo_proyecto ORDER BY total DESC`
    );
    const porAnio = await pool.query(
      `SELECT anio_publicacion as anio, COUNT(*) as total
       FROM proyectos_investigacion WHERE activo=TRUE
       GROUP BY anio_publicacion ORDER BY anio_publicacion DESC LIMIT 6`
    );
    const porProducto = await pool.query(
      `SELECT tipo_producto, COUNT(*) as total
       FROM proyectos_investigacion WHERE activo=TRUE AND tipo_producto IS NOT NULL
       GROUP BY tipo_producto ORDER BY total DESC`
    );
    res.json({
      total: parseInt(total.rows[0].count),
      porTipo: porTipo.rows,
      porAnio: porAnio.rows,
      porProducto: porProducto.rows,
    });
  } catch (error) {
    console.error('Error en estadísticas proyectos:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, opciones, estadisticas };
