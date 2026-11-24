const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
    }

    const result = await pool.query(
      `SELECT u.id, u.nombre, u.correo, u.password_hash, u.activo,
              array_agg(r.nombre) FILTER (WHERE r.nombre IS NOT NULL) as roles
       FROM usuarios u
       LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
       LEFT JOIN roles r ON ur.rol_id = r.id
       WHERE u.correo = $1
       GROUP BY u.id, u.nombre, u.correo, u.password_hash, u.activo`,
      [correo.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Usuario inactivo. Contacte al administrador.' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, roles: usuario.roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        roles: usuario.roles || [],
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nombre, correo, password, rol_id } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existe = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo.toLowerCase()]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const nuevoUsuario = await client.query(
        `INSERT INTO usuarios (nombre, correo, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, correo`,
        [nombre, correo.toLowerCase(), passwordHash]
      );

      const usuarioId = nuevoUsuario.rows[0].id;

      // Asignar rol (por defecto 'docente')
      const rolId = rol_id || (await client.query("SELECT id FROM roles WHERE nombre = 'docente'")).rows[0]?.id;
      if (rolId) {
        await client.query('INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)', [usuarioId, rolId]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        usuario: nuevoUsuario.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  res.json({ usuario: req.user });
};

module.exports = { login, register, me };
