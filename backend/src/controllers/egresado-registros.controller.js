const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================
// Dominios POR EGRESADO del Factor 4.
//
// Igual que en Docentes, este mapa es la única fuente de verdad:
// define las columnas que se leen/escriben, las validaciones y el
// esquema de formulario que consume el frontend en /egresados/esquemas.
// Los nombres de tabla y columna siempre vienen de aquí, nunca del
// body ni de la URL, y los valores viajan como placeholders $n.
//
// El nombre y la cédula del egresado no se repiten en cada dominio:
// viven en la entidad principal (`egresados`) y la ficha ya los muestra.
// ============================================================
const DOMINIOS = {
  grupos: {
    tabla: 'egresado_grupos_investigacion',
    etiqueta: 'vinculación a grupo de investigación',
    titulo: 'Vinculación a grupos de investigación',
    descripcion: 'Vinculación del egresado a grupos de investigación del programa. Una fila por grupo o por periodo de vinculación.',
    orden: 't.anio DESC NULLS LAST, t.created_at DESC',
    campos: [
      { nombre: 'vinculado', etiqueta: 'Vinculación a grupo de investigación', tipo: 'select', opciones: 'SI_NO', valorPorDefecto: 'No', ancho: 'medio' },
      { nombre: 'nombre_grupo', etiqueta: 'Nombre del grupo de investigación', tipo: 'texto', ancho: 'completo' },
      { nombre: 'anio', etiqueta: 'Año', tipo: 'anio', ancho: 'medio' },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: 'ESTADOS_VINCULACION', ancho: 'medio' },
    ],
  },

  posgrados: {
    tabla: 'egresado_posgrados',
    etiqueta: 'vinculación a posgrado',
    titulo: 'Vinculación a posgrados',
    descripcion: 'Posgrados en los que participa o se vincula el egresado.',
    orden: 't.anio DESC NULLS LAST, t.created_at DESC',
    campos: [
      { nombre: 'vinculado', etiqueta: 'Vinculación a posgrado', tipo: 'select', opciones: 'SI_NO', valorPorDefecto: 'No', ancho: 'medio' },
      { nombre: 'nombre_posgrado', etiqueta: 'Nombre del posgrado', tipo: 'texto', ancho: 'completo' },
      { nombre: 'anio', etiqueta: 'Año', tipo: 'anio', ancho: 'medio' },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: 'ESTADOS_VINCULACION', ancho: 'medio' },
    ],
  },

  bienestar: {
    tabla: 'egresado_bienestar',
    etiqueta: 'servicio de bienestar',
    titulo: 'Servicios de bienestar',
    descripcion: 'Servicios de bienestar utilizados por el egresado. Cada servicio utilizado se registra en su propia fila.',
    orden: 't.servicio',
    campos: [
      { nombre: 'servicio', etiqueta: 'Servicio', tipo: 'select', opciones: 'SERVICIOS_BIENESTAR', obligatorio: true, ancho: 'completo' },
    ],
  },

  'seguimiento-grado': {
    tabla: 'egresado_seguimiento_grado',
    etiqueta: 'seguimiento de grado',
    titulo: 'Seguimiento al proceso de grado',
    descripcion: 'Seguimiento del egresado que aún no se ha titulado.',
    orden: 't.fecha_egreso DESC NULLS LAST, t.created_at DESC',
    campos: [
      { nombre: 'fecha_egreso', etiqueta: 'Fecha de egreso', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'tiempo_transcurrido', etiqueta: 'Tiempo transcurrido sin titularse', tipo: 'texto', ancho: 'medio' },
    ],
  },

  reconocimientos: {
    tabla: 'egresado_reconocimientos',
    etiqueta: 'reconocimiento',
    titulo: 'Reconocimientos, distinciones y logros',
    descripcion: 'Reconocimientos, distinciones y logros obtenidos por el egresado.',
    orden: 't.anio_entrega DESC NULLS LAST, t.created_at DESC',
    campos: [
      { nombre: 'tipo_reconocimiento', etiqueta: 'Tipo de reconocimiento', tipo: 'texto', ancho: 'medio' },
      { nombre: 'anio_entrega', etiqueta: 'Año de entrega del reconocimiento', tipo: 'anio', ancho: 'medio' },
      { nombre: 'nombre_reconocimiento', etiqueta: 'Nombre del reconocimiento', tipo: 'texto', ancho: 'completo' },
    ],
  },
};

// ============================================================
// Catálogos GLOBALES del Factor 4 (no dependen de un egresado).
// ============================================================
const CATALOGOS = {
  politicas: {
    tabla: 'politicas_egresados',
    etiqueta: 'política',
    titulo: 'Políticas en torno a egresados',
    descripcion: 'Políticas institucionales en torno a los egresados: su objeto y el enlace al documento.',
    catalogo: true,
    orden: 't.nombre',
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 'completo' },
      { nombre: 'objeto', etiqueta: 'Objeto', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'link', etiqueta: 'Link', tipo: 'texto', ancho: 'completo' },
    ],
  },

  'formacion-continua': {
    tabla: 'formacion_continua',
    etiqueta: 'registro de formación continua',
    titulo: 'Formación continua',
    descripcion: 'Programas de formación continua y los egresados participantes en cada uno.',
    catalogo: true,
    orden: 't.fecha DESC NULLS LAST, t.nombre_programa',
    campos: [
      { nombre: 'nombre_programa', etiqueta: 'Nombre del programa de formación', tipo: 'texto', obligatorio: true, ancho: 'completo' },
      { nombre: 'tipo_programa', etiqueta: 'Tipo de programa de formación', tipo: 'texto', ancho: 'medio' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', ancho: 'medio' },
      { nombre: 'participante_identificacion', etiqueta: 'N.º de identificación de los egresados/as participantes', tipo: 'texto', ancho: 'medio' },
      { nombre: 'participante_nombre', etiqueta: 'Nombre de los egresados/as participantes', tipo: 'texto', ancho: 'medio' },
    ],
  },
};

// ============================================================
// Utilidades internas
// ============================================================
const conError = (mensaje) => {
  const err = new Error(mensaje);
  err.status = 400;
  err.expose = true;
  return err;
};

const dominio = (nombre) => {
  const d = DOMINIOS[nombre];
  if (!d) throw conError('Dominio no válido');
  return d;
};

const catalogo = (nombre) => {
  const d = CATALOGOS[nombre];
  if (!d) throw conError('Catálogo no válido');
  return d;
};

/** Verifica que el egresado exista y esté activo. */
const verificarEgresado = async (req, res) => {
  const { rows } = await pool.query('SELECT id FROM egresados WHERE id = $1 AND activo = TRUE', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ message: 'Egresado no encontrado' });
    return false;
  }
  return true;
};

const extraer = (cfg, body) => {
  const datos = {};
  for (const campo of cfg.campos) {
    if (!(campo.nombre in body)) continue;
    let valor = body[campo.nombre];
    if (typeof valor === 'string') valor = valor.trim();
    if (valor === '') valor = null;
    datos[campo.nombre] = valor;
  }
  return datos;
};

const validarObligatorios = (cfg, datos, parcial) => {
  const faltan = [];
  for (const campo of cfg.campos) {
    if (!campo.obligatorio) continue;
    if (parcial && !(campo.nombre in datos)) continue;
    const v = datos[campo.nombre];
    if (v === undefined || v === null || v === '') faltan.push(campo.etiqueta);
  }
  return faltan.length ? `Campos obligatorios: ${faltan.join(', ')}` : null;
};

const aplicarDefaults = (cfg, datos) => {
  for (const campo of cfg.campos) {
    if (campo.valorPorDefecto !== undefined && (datos[campo.nombre] === undefined || datos[campo.nombre] === null)) {
      datos[campo.nombre] = campo.valorPorDefecto;
    }
  }
};

const responderError = (res, error, contexto) => {
  if (error.expose) return res.status(error.status).json({ message: error.message });
  if (error.code === '23505') return res.status(400).json({ message: 'Ya existe un registro idéntico. Modifique el existente si necesita corregirlo.' });
  if (error.code === '23514') return res.status(400).json({ message: 'Alguno de los valores enviados no está entre los permitidos' });
  if (error.code === '23503') return res.status(400).json({ message: 'La referencia seleccionada no existe' });
  console.error(`Error en ${contexto}:`, error);
  res.status(500).json({ message: 'Error al procesar la solicitud' });
};

// ============================================================
// GET /api/egresados/:id/:dominio
// ============================================================
const listarRegistros = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await verificarEgresado(req, res))) return;

    const result = await pool.query(
      `SELECT t.* FROM ${cfg.tabla} t
       WHERE t.egresado_id = $1 AND t.activo = TRUE
       ORDER BY ${cfg.orden}`,
      [req.params.id]
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    responderError(res, error, 'listar registros de egresado');
  }
};

const crearRegistro = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await verificarEgresado(req, res))) return;

    const datos = extraer(cfg, req.body);
    aplicarDefaults(cfg, datos);
    const errorValidacion = validarObligatorios(cfg, datos, false);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    const campos = [...columnas, 'egresado_id'];
    const valores = [...columnas.map((c) => datos[c]), req.params.id];
    const listaCampos = campos.join(',');
    const listaValores = valores.map((_, i) => `$${i + 1}`).join(',');

    const result = await pool.query(
      `INSERT INTO ${cfg.tabla} (${listaCampos}) VALUES (${listaValores}) RETURNING id`,
      valores
    );
    res.status(201).json({ message: `Registro de ${cfg.etiqueta} creado exitosamente`, id: result.rows[0].id });
  } catch (error) {
    responderError(res, error, 'crear registro de egresado');
  }
};

const actualizarRegistro = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await verificarEgresado(req, res))) return;

    const datos = extraer(cfg, req.body);
    const errorValidacion = validarObligatorios(cfg, datos, true);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    const sets = columnas.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(', ');
    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET ${sets}, updated_at = NOW()
       WHERE id = $${columnas.length + 1} AND egresado_id = $${columnas.length + 2} AND activo = TRUE
       RETURNING id`,
      [...columnas.map((c) => datos[c]), req.params.registroId, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} actualizado exitosamente` });
  } catch (error) {
    responderError(res, error, 'actualizar registro de egresado');
  }
};

const eliminarRegistro = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await verificarEgresado(req, res))) return;

    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET activo = FALSE, updated_at = NOW()
       WHERE id = $1 AND egresado_id = $2 AND activo = TRUE RETURNING id`,
      [req.params.registroId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} eliminado exitosamente` });
  } catch (error) {
    responderError(res, error, 'eliminar registro de egresado');
  }
};

// ============================================================
// Catálogos globales: /api/egresados/catalogo/:dominio
// ============================================================
const listarCatalogo = async (req, res) => {
  try {
    const cfg = catalogo(req.params.dominio);
    const result = await pool.query(
      `SELECT t.* FROM ${cfg.tabla} t WHERE t.activo = TRUE ORDER BY ${cfg.orden}`
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    responderError(res, error, 'listar catálogo de egresados');
  }
};

const crearCatalogo = async (req, res) => {
  try {
    const cfg = catalogo(req.params.dominio);
    const datos = extraer(cfg, req.body);
    aplicarDefaults(cfg, datos);
    const errorValidacion = validarObligatorios(cfg, datos, false);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    const listaCampos = columnas.join(',');
    const listaValores = columnas.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `INSERT INTO ${cfg.tabla} (${listaCampos}) VALUES (${listaValores}) RETURNING id`,
      columnas.map((c) => datos[c])
    );
    res.status(201).json({ message: `Registro de ${cfg.etiqueta} creado exitosamente`, id: result.rows[0].id });
  } catch (error) {
    responderError(res, error, 'crear catálogo de egresados');
  }
};

const actualizarCatalogo = async (req, res) => {
  try {
    const cfg = catalogo(req.params.dominio);
    const datos = extraer(cfg, req.body);
    const errorValidacion = validarObligatorios(cfg, datos, true);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    const sets = columnas.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(', ');
    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET ${sets}, updated_at = NOW()
       WHERE id = $${columnas.length + 1} AND activo = TRUE RETURNING id`,
      [...columnas.map((c) => datos[c]), req.params.registroId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} actualizado exitosamente` });
  } catch (error) {
    responderError(res, error, 'actualizar catálogo de egresados');
  }
};

const eliminarCatalogo = async (req, res) => {
  try {
    const cfg = catalogo(req.params.dominio);
    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET activo = FALSE, updated_at = NOW()
       WHERE id = $1 AND activo = TRUE RETURNING id`,
      [req.params.registroId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} eliminado exitosamente` });
  } catch (error) {
    responderError(res, error, 'eliminar catálogo de egresados');
  }
};

// ============================================================
// GET /api/egresados/esquemas
// ============================================================
const esquemasHandler = async (req, res) => {
  const salida = {};
  for (const [clave, cfg] of Object.entries({ ...DOMINIOS, ...CATALOGOS })) {
    salida[clave] = {
      titulo: cfg.titulo,
      etiqueta: cfg.etiqueta,
      descripcion: cfg.descripcion,
      catalogo: !!cfg.catalogo,
      campos: cfg.campos,
    };
  }
  res.json(salida);
};

module.exports = {
  DOMINIOS, CATALOGOS,
  esquemas: esquemasHandler,
  listarRegistros, crearRegistro, actualizarRegistro, eliminarRegistro,
  listarCatalogo, crearCatalogo, actualizarCatalogo, eliminarCatalogo,
};
