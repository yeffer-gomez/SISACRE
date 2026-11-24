/**
 * seed.js — Crea el usuario administrador por defecto si no existe.
 * Se ejecuta automáticamente al iniciar el backend.
 * Credenciales: admin@udenar.edu.co / Admin@2024
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sisacre_db',
  user: process.env.DB_USER || 'sisacre_user',
  password: process.env.DB_PASSWORD || 'sisacre_pass',
});

const ADMIN_EMAIL = 'admin@udenar.edu.co';
const ADMIN_PASSWORD = 'Admin@2024';
const ADMIN_NAME = 'Administrador SISACRE';

const seed = async () => {
  const client = await pool.connect();
  try {
    // Verificar si el admin ya existe
    const existe = await client.query(
      'SELECT id FROM usuarios WHERE correo = $1',
      [ADMIN_EMAIL]
    );

    if (existe.rows.length > 0) {
      console.log('✅ Usuario administrador ya existe, omitiendo seed.');
      return;
    }

    console.log('🌱 Creando usuario administrador por defecto...');

    // Generar hash con bcrypt (10 rondas)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    await client.query('BEGIN');

    // Insertar usuario
    const result = await client.query(
      `INSERT INTO usuarios (nombre, correo, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (correo) DO NOTHING
       RETURNING id`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('ℹ️  El usuario admin ya fue insertado por otra instancia.');
      return;
    }

    const usuarioId = result.rows[0].id;

    // Obtener rol administrador
    const rolResult = await client.query(
      "SELECT id FROM roles WHERE nombre = 'administrador'"
    );

    if (rolResult.rows.length > 0) {
      await client.query(
        'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [usuarioId, rolResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    console.log('✅ Usuario administrador creado correctamente.');
    console.log(`   Correo:     ${ADMIN_EMAIL}`);
    console.log(`   Contraseña: ${ADMIN_PASSWORD}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', error.message);
    // No lanzar error — el servidor debe arrancar igual
  } finally {
    client.release();
    await pool.end();
  }
};

module.exports = { seed };
