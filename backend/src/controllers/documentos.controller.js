const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GET /api/documentos - Listar con filtros
const listar = async (req, res) => {
  try {
    const {
      factor_id, caracteristica_id, tipo_evidencia_id,
      anio, semestre, responsable, busqueda,
      page = 1, limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['d.activo = TRUE'];

    if (factor_id) { params.push(factor_id); conditions.push(`d.factor_id = $${params.length}`); }
    if (caracteristica_id) { params.push(caracteristica_id); conditions.push(`d.caracteristica_id = $${params.length}`); }
    if (tipo_evidencia_id) { params.push(tipo_evidencia_id); conditions.push(`d.tipo_evidencia_id = $${params.length}`); }
    if (anio) { params.push(anio); conditions.push(`d.anio = $${params.length}`); }
    if (semestre) { params.push(semestre); conditions.push(`d.semestre = $${params.length}`); }
    if (responsable) { params.push(`%${responsable}%`); conditions.push(`d.responsable ILIKE $${params.length}`); }
    if (busqueda) { params.push(`%${busqueda}%`); conditions.push(`(d.titulo ILIKE $${params.length} OR d.descripcion ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM documentos d ${where}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT d.id, d.titulo, d.descripcion, d.anio, d.semestre, d.responsable, d.created_at,
              f.codigo as factor_codigo, f.nombre as factor_nombre,
              c.codigo as caracteristica_codigo, c.nombre as caracteristica_nombre,
              te.nombre as tipo_evidencia,
              u.nombre as subido_por_nombre,
              vd.nombre_original, vd.tipo_mime, vd.tamanio_bytes
       FROM documentos d
       LEFT JOIN factores f ON d.factor_id = f.id
       LEFT JOIN caracteristicas c ON d.caracteristica_id = c.id
       LEFT JOIN tipos_evidencia te ON d.tipo_evidencia_id = te.id
       LEFT JOIN usuarios u ON d.subido_por = u.id
       LEFT JOIN versiones_documento vd ON vd.documento_id = d.id AND vd.es_version_actual = TRUE
       ${where}
       ORDER BY d.created_at DESC
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
    console.error('Error al listar documentos:', error);
    res.status(500).json({ message: 'Error al obtener documentos' });
  }
};

// GET /api/documentos/:id
const obtener = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, 
              f.codigo as factor_codigo, f.nombre as factor_nombre,
              c.codigo as caracteristica_codigo, c.nombre as caracteristica_nombre,
              te.nombre as tipo_evidencia,
              u.nombre as subido_por_nombre
       FROM documentos d
       LEFT JOIN factores f ON d.factor_id = f.id
       LEFT JOIN caracteristicas c ON d.caracteristica_id = c.id
       LEFT JOIN tipos_evidencia te ON d.tipo_evidencia_id = te.id
       LEFT JOIN usuarios u ON d.subido_por = u.id
       WHERE d.id = $1 AND d.activo = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Obtener versiones
    const versiones = await pool.query(
      `SELECT vd.*, u.nombre as subido_por_nombre
       FROM versiones_documento vd
       LEFT JOIN usuarios u ON vd.subido_por = u.id
       WHERE vd.documento_id = $1
       ORDER BY vd.version_numero DESC`,
      [id]
    );

    res.json({ ...result.rows[0], versiones: versiones.rows });
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ message: 'Error al obtener documento' });
  }
};

// POST /api/documentos - Crear documento con archivo
const crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      titulo, descripcion, factor_id, caracteristica_id,
      tipo_evidencia_id, anio, semestre, responsable, notas_version
    } = req.body;

    if (!titulo || !anio || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Título, año y archivo son requeridos' });
    }

    await client.query('BEGIN');

    const docResult = await client.query(
      `INSERT INTO documentos (titulo, descripcion, factor_id, caracteristica_id, tipo_evidencia_id, anio, semestre, responsable, subido_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [titulo, descripcion, factor_id || null, caracteristica_id || null, tipo_evidencia_id || null,
       anio, semestre, responsable, req.user.id]
    );

    const documentoId = docResult.rows[0].id;

    await client.query(
      `INSERT INTO versiones_documento (documento_id, version_numero, nombre_archivo, nombre_original, ruta_archivo, tipo_mime, tamanio_bytes, es_version_actual, subido_por, notas_version)
       VALUES ($1, 1, $2, $3, $4, $5, $6, TRUE, $7, $8)`,
      [documentoId, req.file.filename, req.file.originalname, req.file.path,
       req.file.mimetype, req.file.size, req.user.id, notas_version || 'Versión inicial']
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Documento creado exitosamente',
      id: documentoId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error al crear documento:', error);
    res.status(500).json({ message: 'Error al crear documento' });
  } finally {
    client.release();
  }
};

// PUT /api/documentos/:id - Actualizar metadatos
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo, descripcion, factor_id, caracteristica_id,
      tipo_evidencia_id, anio, semestre, responsable
    } = req.body;

    const result = await pool.query(
      `UPDATE documentos SET titulo=$1, descripcion=$2, factor_id=$3, caracteristica_id=$4,
       tipo_evidencia_id=$5, anio=$6, semestre=$7, responsable=$8, updated_at=NOW()
       WHERE id=$9 AND activo=TRUE RETURNING id`,
      [titulo, descripcion, factor_id || null, caracteristica_id || null,
       tipo_evidencia_id || null, anio, semestre, responsable, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    res.json({ message: 'Documento actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({ message: 'Error al actualizar documento' });
  }
};

// DELETE /api/documentos/:id - Eliminación lógica
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE documentos SET activo=FALSE, updated_at=NOW() WHERE id=$1 AND activo=TRUE RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    res.json({ message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ message: 'Error al eliminar documento' });
  }
};

// POST /api/documentos/:id/versiones - Nueva versión
const nuevaVersion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { notas_version } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Archivo requerido para nueva versión' });
    }

    const docCheck = await pool.query('SELECT id FROM documentos WHERE id=$1 AND activo=TRUE', [id]);
    if (docCheck.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    await client.query('BEGIN');

    // Marcar versiones anteriores
    await client.query(
      'UPDATE versiones_documento SET es_version_actual=FALSE WHERE documento_id=$1',
      [id]
    );

    // Obtener número de versión
    const versionResult = await client.query(
      'SELECT MAX(version_numero) as max_v FROM versiones_documento WHERE documento_id=$1',
      [id]
    );
    const nuevaV = (versionResult.rows[0].max_v || 0) + 1;

    await client.query(
      `INSERT INTO versiones_documento (documento_id, version_numero, nombre_archivo, nombre_original, ruta_archivo, tipo_mime, tamanio_bytes, es_version_actual, subido_por, notas_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9)`,
      [id, nuevaV, req.file.filename, req.file.originalname, req.file.path,
       req.file.mimetype, req.file.size, req.user.id, notas_version || `Versión ${nuevaV}`]
    );

    await client.query(
      'UPDATE documentos SET updated_at=NOW() WHERE id=$1', [id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: `Versión ${nuevaV} creada exitosamente` });
  } catch (error) {
    await client.query('ROLLBACK');
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error al crear versión:', error);
    res.status(500).json({ message: 'Error al crear nueva versión' });
  } finally {
    client.release();
  }
};

// GET /api/documentos/:id/descargar - Descargar versión actual
const descargar = async (req, res) => {
  try {
    const { id } = req.params;
    const versionId = req.query.version_id;

    let query = `SELECT ruta_archivo, nombre_original, tipo_mime FROM versiones_documento WHERE documento_id=$1`;
    const params = [id];

    if (versionId) {
      params.push(versionId);
      query += ` AND id=$2`;
    } else {
      query += ` AND es_version_actual=TRUE`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const { ruta_archivo, nombre_original, tipo_mime } = result.rows[0];

    if (!fs.existsSync(ruta_archivo)) {
      return res.status(404).json({ message: 'Archivo físico no encontrado' });
    }

    res.setHeader('Content-Type', tipo_mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre_original)}"`);
    res.sendFile(path.resolve(ruta_archivo));
  } catch (error) {
    console.error('Error al descargar:', error);
    res.status(500).json({ message: 'Error al descargar archivo' });
  }
};

// GET /api/documentos/:id/visualizar
const visualizar = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ruta_archivo, nombre_original, tipo_mime FROM versiones_documento WHERE documento_id=$1 AND es_version_actual=TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const { ruta_archivo, nombre_original, tipo_mime } = result.rows[0];

    if (!fs.existsSync(ruta_archivo)) {
      return res.status(404).json({ message: 'Archivo físico no encontrado' });
    }

    res.setHeader('Content-Type', tipo_mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombre_original)}"`);
    res.sendFile(path.resolve(ruta_archivo));
  } catch (error) {
    console.error('Error al visualizar:', error);
    res.status(500).json({ message: 'Error al visualizar archivo' });
  }
};

// GET /api/documentos/estadisticas
const estadisticas = async (req, res) => {
  try {
    const porFactor = await pool.query(
      `SELECT f.nombre as factor, COUNT(d.id) as total
       FROM factores f LEFT JOIN documentos d ON f.id = d.factor_id AND d.activo = TRUE
       GROUP BY f.id, f.nombre ORDER BY f.id`
    );

    const porAnio = await pool.query(
      `SELECT anio, COUNT(*) as total FROM documentos WHERE activo=TRUE GROUP BY anio ORDER BY anio DESC LIMIT 5`
    );

    const porTipo = await pool.query(
      `SELECT te.nombre as tipo, COUNT(d.id) as total
       FROM tipos_evidencia te LEFT JOIN documentos d ON te.id = d.tipo_evidencia_id AND d.activo = TRUE
       GROUP BY te.id, te.nombre ORDER BY total DESC`
    );

    const resumen = await pool.query(
      `SELECT COUNT(*) as total_documentos FROM documentos WHERE activo=TRUE`
    );

    res.json({
      porFactor: porFactor.rows,
      porAnio: porAnio.rows,
      porTipo: porTipo.rows,
      totalDocumentos: parseInt(resumen.rows[0].total_documentos),
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, nuevaVersion, descargar, visualizar, estadisticas };
