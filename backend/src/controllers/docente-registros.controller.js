const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const { OPCIONES, verificarAccesoFicha } = require('./docentes.controller');

// ============================================================
// Definición de los 6 dominios históricos del docente.
//
// Este mapa es la ÚNICA fuente de verdad: define a la vez
//   - las columnas que se leen y escriben (nombres de tabla y
//     columna vienen SIEMPRE de aquí, nunca del body ni de la URL)
//   - las validaciones obligatorias
//   - el esquema de formulario que consume el frontend en
//     GET /api/docentes/esquemas
//
// Los valores del body SIEMPRE viajan como placeholders $n, por
// lo que no hay superficie de inyección SQL pese a ser dinámico.
// ============================================================
const DOMINIOS = {
  vinculaciones: {
    tabla: 'docente_vinculaciones',
    etiqueta: 'registro de vinculación',
    titulo: 'Vinculación',
    descripcion: 'Histórico de vinculaciones. Cada cambio de tipo de vinculación se registra como una entrada nueva; las anteriores no se sobrescriben.',
    registrarPor: true,
    orden: 't.anio_vinculacion DESC, COALESCE(t.fecha_vinculacion, DATE \'1900-01-01\') DESC, t.created_at DESC',
    joins: `LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'd.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'anio_vinculacion', etiqueta: 'Año de vinculación', tipo: 'anio', obligatorio: true, ancho: 'medio' },
      { nombre: 'fecha_vinculacion', etiqueta: 'Fecha de vinculación', tipo: 'fecha' },
      { nombre: 'tipo_vinculacion', etiqueta: 'Tipo de vinculación', tipo: 'select', opciones: 'TIPOS_VINCULACION', obligatorio: true },
      { nombre: 'dedicacion', etiqueta: 'Dedicación', tipo: 'select', opciones: 'DEDICACIONES' },
      { nombre: 'tiempo_vinculacion', etiqueta: 'Tiempo de vinculación', tipo: 'select', opciones: 'TIEMPOS_VINCULACION' },
      { nombre: 'horas_semanales', etiqueta: 'Horas semanales', tipo: 'horas' },
      { nombre: 'acto_vinculacion', etiqueta: 'Acto de vinculación', tipo: 'texto' },
      { nombre: 'acuerdo_hora_catedra', etiqueta: 'Acuerdo de ganador de hora cátedra', tipo: 'texto' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },

  formaciones: {
    tabla: 'docente_formaciones',
    etiqueta: 'estudio registrado',
    titulo: 'Formación Académica',
    descripcion: 'Un docente puede registrar tantos estudios como tenga. El nivel no se limita a un único registro.',
    orden: 't.anio_graduacion DESC NULLS LAST, t.created_at DESC',
    joins: `LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'd.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'nivel_formacion', etiqueta: 'Nivel de formación', tipo: 'select', opciones: 'NIVELES_FORMACION', obligatorio: true },
      { nombre: 'titulo', etiqueta: 'Título o grado obtenido', tipo: 'texto', obligatorio: true },
      { nombre: 'programa', etiqueta: 'Programa', tipo: 'texto' },
      { nombre: 'institucion', etiqueta: 'Universidad / Institución', tipo: 'texto' },
      { nombre: 'pais', etiqueta: 'País', tipo: 'texto' },
      { nombre: 'anio_graduacion', etiqueta: 'Año', tipo: 'anio' },
      { nombre: 'formacion_complementaria', etiqueta: 'Formación complementaria', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'documento_id', etiqueta: 'Evidencia / documento', tipo: 'select', opcionesEndpoint: '/api/docentes/{id}/documentos', opcionesEtiqueta: 'titulo', ancho: 'completo' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },

  escalafones: {
    tabla: 'docente_escalafones',
    etiqueta: 'registro de escalafón',
    titulo: 'Escalafón Docente',
    descripcion: 'Histórico de escalafón según el Decreto 1279 de 2002. Los ascensos se acumulan; ningún registro anterior se modifica.',
    orden: 't.fecha DESC, t.created_at DESC',
    joins: `LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'd.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'nivel', etiqueta: 'Nivel', tipo: 'select', opciones: 'NIVELES_ESCALAFON', obligatorio: true },
      { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: 'CATEGORIAS_ESCALAFON' },
      { nombre: 'fecha', etiqueta: 'Fecha de ingreso al escalafón', tipo: 'fecha', obligatorio: true },
      { nombre: 'decreto_1279', etiqueta: 'Decreto 1279', tipo: 'texto', valorPorDefecto: 'Decreto 1279 de 2002' },
      { nombre: 'acto_ascenso', etiqueta: 'Acto de ascenso', tipo: 'texto' },
      { nombre: 'fecha_ascenso', etiqueta: 'Fecha de ascenso', tipo: 'fecha' },
      { nombre: 'categoria_investigador', etiqueta: 'Categoría de investigador', tipo: 'texto' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },

  evaluaciones: {
    tabla: 'docente_evaluaciones',
    etiqueta: 'evaluación',
    titulo: 'Evaluación Docente',
    descripcion: 'Cada evaluador (estudiantes, autoevaluación, colegas, jefes, externas) se guarda en su propia fila; nunca se combinan en un único resultado.',
    orden: 't.anio DESC, t.evaluador',
    joins: `LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'd.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'anio', etiqueta: 'Año', tipo: 'anio', obligatorio: true, ancho: 'medio' },
      { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'select', opciones: 'PERIODOS', ancho: 'medio' },
      { nombre: 'tipo_evaluacion', etiqueta: 'Tipo de evaluación', tipo: 'texto', ancho: 'medio' },
      { nombre: 'evaluador', etiqueta: 'Evaluador', tipo: 'select', opciones: 'EVALUADORES', obligatorio: true, ancho: 'medio' },
      { nombre: 'escala', etiqueta: 'Escala', tipo: 'select', opciones: 'ESCALAS', ancho: 'medio' },
      { nombre: 'resultado', etiqueta: 'Resultado', tipo: 'numero', ancho: 'medio' },
      { nombre: 'accion_mejora', etiqueta: 'Acción de mejora', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },

  mejoramientos: {
    tabla: 'docente_planes_mejoramiento',
    etiqueta: 'plan de mejoramiento',
    titulo: 'Planes de Mejoramiento',
    descripcion: 'Hallazgos, acciones y seguimiento de los planes de mejoramiento. Los estados posibles son Pendiente, En proceso y Cumplido.',
    orden: 't.anio DESC, t.estado',
    joins: `LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'd.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'anio', etiqueta: 'Año', tipo: 'anio', obligatorio: true, ancho: 'medio' },
      { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'select', opciones: 'PERIODOS', ancho: 'medio' },
      { nombre: 'plan', etiqueta: 'Plan', tipo: 'texto', obligatorio: true, ancho: 'completo' },
      { nombre: 'hallazgo', etiqueta: 'Hallazgo', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'accion', etiqueta: 'Acción', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'responsable', etiqueta: 'Responsable', tipo: 'texto' },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: 'ESTADOS_MEJORAMIENTO', obligatorio: true, valorPorDefecto: 'Pendiente' },
      { nombre: 'fecha_inicio', etiqueta: 'Fecha de inicio', tipo: 'fecha' },
      { nombre: 'fecha_fin', etiqueta: 'Fecha de fin', tipo: 'fecha' },
      { nombre: 'seguimiento', etiqueta: 'Seguimiento', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },

  redes: {
    tabla: 'docente_redes',
    etiqueta: 'participación en red',
    titulo: 'Redes Académicas',
    descripcion: 'Una red académica se registra una sola vez en el catálogo y se reutiliza para todos los docentes que participan en ella.',
    orden: 't.anio_inicio DESC, t.created_at DESC',
    joins: `JOIN redes_academicas ra ON ra.id = t.red_id
            LEFT JOIN documentos d ON d.id = t.documento_id AND d.activo = TRUE`,
    columnasExtra: 'ra.nombre AS red_nombre, ra.tipo_alcance, ra.sitio_web, d.titulo AS evidencia_titulo, d.id AS evidencia_id',
    campos: [
      { nombre: 'red_id', etiqueta: 'Red académica', tipo: 'select', opcionesEndpoint: '/api/redes-academicas', opcionesEtiqueta: 'nombre', obligatorio: true, ancho: 'completo' },
      { nombre: 'tipo_participacion', etiqueta: 'Tipo de participación', tipo: 'select', opciones: 'TIPOS_PARTICIPACION_RED' },
      { nombre: 'anio_inicio', etiqueta: 'Año de inicio', tipo: 'anio', obligatorio: true, ancho: 'medio' },
      { nombre: 'anio_fin', etiqueta: 'Año de finalización', tipo: 'anio', ancho: 'medio' },
      { nombre: 'periodo', etiqueta: 'Periodo', tipo: 'select', opciones: 'PERIODOS' },
      { nombre: 'participacion', etiqueta: 'Participación', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'impacto', etiqueta: 'Impacto', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'resultados', etiqueta: 'Resultados', tipo: 'textarea', ancho: 'completo' },
      { nombre: 'enlace_referencia', etiqueta: 'Enlace / referencia', tipo: 'texto' },
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo' },
    ],
  },
};

// ============================================================
// Utilidades internas
// ============================================================
const dominio = (nombre) => {
  const d = DOMINIOS[nombre];
  if (!d) {
    const err = new Error('Dominio no válido');
    err.status = 400;
    err.expose = true;
    throw err;
  }
  return d;
};

/**
 * Valida el `docente_id` y, además, que el solicitante tenga derecho a ver
 * esa ficha. Los cuatro handlers de dominio (listar, crear, actualizar y
 * eliminar) pasan por aquí, así que un rol `docente` no puede leer ni
 * escribir en el historial de otro colega aunque conozca el UUID.
 */
const validarEsquema = (req, res) => verificarAccesoFicha(req, res, req.params.id);

/** Extrae del body sólo los campos declarados en el esquema. */
const extraer = (cfg, body) => {
  const datos = {};
  for (const campo of cfg.campos) {
    if (!(campo.nombre in body)) continue;
    const bruto = body[campo.nombre];
    if (bruto === '' || bruto === undefined) { datos[campo.nombre] = null; continue; }
    if (['anio', 'numero', 'horas'].includes(campo.tipo)) {
      const n = Number(bruto);
      datos[campo.nombre] = Number.isFinite(n) ? n : bruto;
    } else {
      datos[campo.nombre] = typeof bruto === 'string' ? bruto.trim() : bruto;
    }
  }
  return datos;
};

const validarObligatorios = (cfg, datos, parcial) => {
  const faltan = [];
  for (const campo of cfg.campos) {
    if (!campo.obligatorio) continue;
    if (parcial && !(campo.nombre in datos)) continue;
    const v = datos[campo.nombre];
    if (v === undefined || v === null || v === '') {
      faltan.push(campo.etiqueta);
    }
  }
  if (faltan.length) return `Campos obligatorios: ${faltan.join(', ')}`;
  return null;
};

const aplicarDefaults = (cfg, datos) => {
  for (const campo of cfg.campos) {
    if (campo.valorPorDefecto && (datos[campo.nombre] === undefined || datos[campo.nombre] === null || datos[campo.nombre] === '')) {
      datos[campo.nombre] = campo.valorPorDefecto;
    }
  }
};

// ============================================================
// GET /api/docentes/esquemas
// Alimenta los formularios del frontend sin duplicar la definición
// de campos en el cliente.
// ============================================================
const esquemas = async (req, res) => {
  const salida = {};
  for (const [clave, cfg] of Object.entries(DOMINIOS)) {
    salida[clave] = {
      titulo: cfg.titulo,
      etiqueta: cfg.etiqueta,
      descripcion: cfg.descripcion,
      campos: cfg.campos,
    };
  }
  res.json(salida);
};

// ============================================================
// GET /api/docentes/:id/:dominio
// ============================================================
const listarRegistros = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await validarEsquema(req, res))) return;

    const result = await pool.query(
      `SELECT t.* ${cfg.columnasExtra ? ', ' + cfg.columnasExtra : ''}
       FROM ${cfg.tabla} t
       ${cfg.joins || ''}
       WHERE t.docente_id = $1 AND t.activo = TRUE
       ORDER BY ${cfg.orden}`,
      [req.params.id]
    );

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ message: error.message });
    console.error('Error al listar registros del docente:', error);
    res.status(500).json({ message: 'Error al obtener los registros' });
  }
};

// ============================================================
// POST /api/docentes/:id/:dominio
// ============================================================
const crearRegistro = async (req, res) => {
  const client = await pool.connect();
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await validarEsquema(req, res))) return;

    const datos = extraer(cfg, req.body);
    const errorValidacion = validarObligatorios(cfg, datos, false);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });
    aplicarDefaults(cfg, datos);

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    // Campos y valores deben construirse en el MISMO orden: si `docente_id`
    // y `registrado_por` no quedan alineados, el id del usuario se guarda
    // como docente y la violacion de FK hace fallar el INSERT.
    const camposInsert = [...columnas];
    const valoresInsert = columnas.map((c) => datos[c]);
    if (cfg.registrarPor) {
      camposInsert.push('registrado_por');
      valoresInsert.push(req.user.id);
    }
    camposInsert.push('docente_id');
    valoresInsert.push(req.params.id);

    const listaCampos = camposInsert.join(',');
    const listaValores = valoresInsert.map((_, i) => `$${i + 1}`).join(',');

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO ${cfg.tabla} (${listaCampos}) VALUES (${listaValores}) RETURNING id`,
      valoresInsert
    );
    await client.query('COMMIT');

    res.status(201).json({ message: `Registro de ${cfg.etiqueta} creado exitosamente`, id: result.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.expose) return res.status(error.status).json({ message: error.message });
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Ya existe un registro idéntico para este docente. Modifique el existente si necesita corregirlo.' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ message: 'Alguno de los valores enviados no está entre los permitidos' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'La referencia seleccionada no existe' });
    }
    console.error('Error al crear registro del docente:', error);
    res.status(500).json({ message: 'Error al crear el registro' });
  } finally {
    client.release();
  }
};

// ============================================================
// PUT /api/docentes/:id/:dominio/:registroId
// COALESCE en el SET: un PUT parcial nunca borra la información
// que el cliente no envió.
// ============================================================
const actualizarRegistro = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await validarEsquema(req, res))) return;

    const datos = extraer(cfg, req.body);
    const errorValidacion = validarObligatorios(cfg, datos, true);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ message: 'No se envió ningún dato' });

    const sets = columnas.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(', ');
    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET ${sets}, updated_at = NOW()
       WHERE id = $${columnas.length + 1} AND docente_id = $${columnas.length + 2} AND activo = TRUE
       RETURNING id`,
      [...columnas.map((c) => datos[c]), req.params.registroId, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} actualizado exitosamente` });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ message: error.message });
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Ya existe un registro idéntico para este docente' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ message: 'Alguno de los valores enviados no está entre los permitidos' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'La referencia seleccionada no existe' });
    }
    console.error('Error al actualizar registro del docente:', error);
    res.status(500).json({ message: 'Error al actualizar el registro' });
  }
};

// ============================================================
// DELETE /api/docentes/:id/:dominio/:registroId
// Eliminación lógica, igual que documentos y proyectos.
// ============================================================
const eliminarRegistro = async (req, res) => {
  try {
    const cfg = dominio(req.params.dominio);
    if (!(await validarEsquema(req, res))) return;

    const result = await pool.query(
      `UPDATE ${cfg.tabla} SET activo = FALSE, updated_at = NOW()
       WHERE id = $1 AND docente_id = $2 AND activo = TRUE RETURNING id`,
      [req.params.registroId, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: `Registro de ${cfg.etiqueta} eliminado exitosamente` });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ message: error.message });
    console.error('Error al eliminar registro del docente:', error);
    res.status(500).json({ message: 'Error al eliminar el registro' });
  }
};

// ============================================================
// Redes académicas: catálogo compartido entre docentes
// ============================================================
const CAMPOS_RED = {
  nombre: 'texto',
  tipo_alcance: 'texto',
  descripcion: 'texto',
  sitio_web: 'texto',
};

const listarRedes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              (SELECT COUNT(*)::int FROM docente_redes dr WHERE dr.red_id = r.id AND dr.activo = TRUE) AS total_docentes
       FROM redes_academicas r
       WHERE r.activo = TRUE
       ORDER BY r.nombre`
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error al listar redes académicas:', error);
    res.status(500).json({ message: 'Error al obtener las redes académicas' });
  }
};

const crearRed = async (req, res) => {
  try {
    const { nombre, tipo_alcance, descripcion, sitio_web } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre de la red es obligatorio' });
    }
    if (!tipo_alcance || !OPCIONES.TIPOS_ALCANCE_RED.includes(tipo_alcance)) {
      return res.status(400).json({ message: `Tipo de alcance inválido. Valores permitidos: ${OPCIONES.TIPOS_ALCANCE_RED.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO redes_academicas (nombre, tipo_alcance, descripcion, sitio_web)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [String(nombre).trim(), tipo_alcance, descripcion || null, sitio_web || null]
    );
    res.status(201).json({ message: 'Red académica creada exitosamente', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe una red académica con ese nombre' });
    if (error.code === '23514') return res.status(400).json({ message: 'Tipo de alcance no permitido' });
    console.error('Error al crear red académica:', error);
    res.status(500).json({ message: 'Error al crear la red académica' });
  }
};

const actualizarRed = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo_alcance, descripcion, sitio_web } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre de la red es obligatorio' });
    }
    if (tipo_alcance && !OPCIONES.TIPOS_ALCANCE_RED.includes(tipo_alcance)) {
      return res.status(400).json({ message: `Tipo de alcance inválido. Valores permitidos: ${OPCIONES.TIPOS_ALCANCE_RED.join(', ')}` });
    }
    const result = await pool.query(
      `UPDATE redes_academicas SET
         nombre = COALESCE($1, nombre),
         tipo_alcance = COALESCE($2, tipo_alcance),
         descripcion = COALESCE($3, descripcion),
         sitio_web = COALESCE($4, sitio_web),
         created_at = created_at
       WHERE id = $5 AND activo = TRUE RETURNING id`,
      [String(nombre).trim(), tipo_alcance || null, descripcion, sitio_web || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Red académica no encontrada' });
    res.json({ message: 'Red académica actualizada exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe una red académica con ese nombre' });
    if (error.code === '23514') return res.status(400).json({ message: 'Tipo de alcance no permitido' });
    console.error('Error al actualizar red académica:', error);
    res.status(500).json({ message: 'Error al actualizar la red académica' });
  }
};

module.exports = {
  listarRegistros, crearRegistro, actualizarRegistro, eliminarRegistro,
  esquemas, listarRedes, crearRed, actualizarRed, DOMINIOS,
};
