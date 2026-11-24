const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GET /api/usuarios
const listar = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.correo, u.activo, u.created_at,
              array_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL) as roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
       LEFT JOIN roles r ON ur.rol_id = r.id
       GROUP BY u.id, u.nombre, u.correo, u.activo, u.created_at
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// PUT /api/usuarios/:id/roles
const asignarRoles = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { rol_ids } = req.body;

    if (!Array.isArray(rol_ids)) {
      return res.status(400).json({ message: 'rol_ids debe ser un arreglo' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM usuario_roles WHERE usuario_id=$1', [id]);

    for (const rolId of rol_ids) {
      await client.query(
        'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, rolId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Roles asignados correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al asignar roles:', error);
    res.status(500).json({ message: 'Error al asignar roles' });
  } finally {
    client.release();
  }
};

// PUT /api/usuarios/:id/estado
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    await pool.query('UPDATE usuarios SET activo=$1, updated_at=NOW() WHERE id=$2', [activo, id]);
    res.json({ message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error al cambiar estado del usuario' });
  }
};

// GET /api/roles
const listarRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

module.exports = { listar, asignarRoles, cambiarEstado, listarRoles };
