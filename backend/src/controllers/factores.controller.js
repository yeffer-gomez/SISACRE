const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const listar = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, 
              (SELECT COUNT(*) FROM caracteristicas c WHERE c.factor_id = f.id AND c.activo = TRUE) as total_caracteristicas,
              (SELECT COUNT(*) FROM documentos d WHERE d.factor_id = f.id AND d.activo = TRUE) as total_documentos
       FROM factores f WHERE f.activo = TRUE ORDER BY f.codigo`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener factores' });
  }
};

const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const factor = await pool.query('SELECT * FROM factores WHERE id=$1 AND activo=TRUE', [id]);
    if (factor.rows.length === 0) return res.status(404).json({ message: 'Factor no encontrado' });

    const caracteristicas = await pool.query(
      'SELECT * FROM caracteristicas WHERE factor_id=$1 AND activo=TRUE ORDER BY codigo', [id]
    );

    res.json({ ...factor.rows[0], caracteristicas: caracteristicas.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener factor' });
  }
};

const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion } = req.body;
    const result = await pool.query(
      'INSERT INTO factores (codigo, nombre, descripcion) VALUES ($1, $2, $3) RETURNING *',
      [codigo, nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'El código ya existe' });
    res.status(500).json({ message: 'Error al crear factor' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, activo } = req.body;
    const result = await pool.query(
      'UPDATE factores SET codigo=$1, nombre=$2, descripcion=$3, activo=$4 WHERE id=$5 RETURNING *',
      [codigo, nombre, descripcion, activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Factor no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar factor' });
  }
};

// GET /api/factores/:id/caracteristicas
const listarCaracteristicas = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM caracteristicas WHERE factor_id=$1 AND activo=TRUE ORDER BY codigo', [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener características' });
  }
};

const crearCaracteristica = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion } = req.body;
    const result = await pool.query(
      'INSERT INTO caracteristicas (factor_id, codigo, nombre, descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, codigo, nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear característica' });
  }
};

// GET /api/tipos-evidencia
const listarTipos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipos_evidencia ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tipos de evidencia' });
  }
};

module.exports = { listar, obtener, crear, actualizar, listarCaracteristicas, crearCaracteristica, listarTipos };
