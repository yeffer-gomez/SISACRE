const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================
// Catálogos
// Sus valores son los mismos que los CHECK constraints de
// init.sql / migrate-docentes.sql. El frontend los consume para
// armar los <select> y así no puede desincronizarse la lista.
// ============================================================
const OPCIONES = {
  TIPOS_VINCULACION: ['Tiempo completo', 'Hora cátedra', 'Medio tiempo'],
  ESTADOS: ['Activo', 'Inactivo', 'Jubilado', 'Licencia'],
  DEDICACIONES: ['Tiempo completo', 'Dedicación media', 'Tiempo parcial', 'Por horas'],
  TIEMPOS_VINCULACION: ['Permanente', 'Temporal', 'Por período'],
  NIVELES_ESCALAFON: ['Auxiliar', 'Asistente', 'Asociado', 'Titular', 'Catedrático'],
  CATEGORIAS_ESCALAFON: ['1', '2', '3', '4'],
  NIVELES_FORMACION: ['Pregrado', 'Especialización', 'Maestría', 'Doctorado', 'Posdoctorado', 'Otros'],
  PERIODOS: ['Semestre A', 'Semestre B', 'Anual'],
  EVALUADORES: ['Estudiantes', 'Autoevaluación', 'Colegas', 'Jefes', 'Externas'],
  ESCALAS: ['0-5', '1-5', '1-7', '1-100'],
  ESTADOS_MEJORAMIENTO: ['Pendiente', 'En proceso', 'Cumplido'],
  TIPOS_ALCANCE_RED: ['Institucional', 'Nacional', 'Internacional', 'Regional'],
  TIPOS_PARTICIPACION_RED: ['Miembro', 'Coordinador', 'Presidente', 'Director'],
};

// Origen de un registro de dominio → tabla donde vive su evidencia.
// Sirve tanto para listar las evidencias de un docente como para
// enlazar un documento nuevo sin adivinar la tabla de destino.
const ORIGENES = {
  vinculacion: { tabla: 'docente_vinculaciones', caracteristica: 'F3C1', etiqueta: 'Vinculación' },
  formacion: { tabla: 'docente_formaciones', caracteristica: 'F3C3', etiqueta: 'Formación' },
  escalafon: { tabla: 'docente_escalafones', caracteristica: 'F3C2', etiqueta: 'Escalafón' },
  evaluacion: { tabla: 'docente_evaluaciones', caracteristica: 'F3C2', etiqueta: 'Evaluación' },
  mejoramiento: { tabla: 'docente_planes_mejoramiento', caracteristica: 'F3C4', etiqueta: 'Mejoramiento' },
  red: { tabla: 'docente_redes', caracteristica: 'F3C2', etiqueta: 'Redes' },
};

// ============================================================
// Autorización de lectura
// Un usuario con rol `docente` que no sea gestor solo ve su
// propia ficha. La seguridad se valida aquí, en backend.
// ============================================================
const roles = (req) => (req.user && req.user.roles) || [];
const esGestor = (req) =>
  roles(req).includes('administrador') || roles(req).includes('coordinador');
const esDocente = (req) => roles(req).includes('docente');
const soloSuPropiaFicha = (req) => esDocente(req) && !esGestor(req);

/**
 * Guarda de acceso a los subrecursos de un docente (histórico, evidencias y
 * dominios). `GET /docentes/:id` ya valida la ficha, pero los endpoints hijos
 * también deben comprobarlo: si no, un rol `docente` podría leer el
 * historial de cualquier colegaisemento por el UUID.
 *
 * Devuelve `true` si la petición puede continuar. Si no, ya respondió con
 * 404 o 403 y el llamador debe hacer return.
 */
const verificarAccesoFicha = async (req, res, docenteId) => {
  const { rows } = await pool.query(
    'SELECT id, usuario_id FROM docentes WHERE id = $1 AND activo = TRUE',
    [docenteId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Docente no encontrado' });
    return false;
  }
  if (soloSuPropiaFicha(req) && rows[0].usuario_id !== req.user.id) {
    res.status(403).json({ message: 'Solo puede consultar su propia ficha de docente' });
    return false;
  }
  return true;
};

// ============================================================
// Subconsulta reutilizable: vinculación vigente del docente.
// Es la fila más reciente; el histórico NUNCA se sobrescribe, así
// que no existe una columna "actual" que pueda quedar desfasada.
// ============================================================
const SQL_VINCULACION_VIGENTE = `
  LEFT JOIN LATERAL (
    SELECT v.id, v.tipo_vinculacion, v.dedicacion, v.anio_vinculacion, v.fecha_vinculacion,
           v.tiempo_vinculacion, v.horas_semanales, v.acto_vinculacion, v.acuerdo_hora_catedra
     FROM docente_vinculaciones v
     WHERE v.docente_id = d.id AND v.activo = TRUE
     ORDER BY v.anio_vinculacion DESC,
             COALESCE(v.fecha_vinculacion, DATE '1900-01-01') DESC,
             v.created_at DESC
    LIMIT 1
  ) vin ON TRUE`;

const SQL_ESCALAFON_VIGENTE = `
  LEFT JOIN LATERAL (
    SELECT e.id, e.nivel, e.categoria, e.fecha, e.categoria_investigador
     FROM docente_escalafones e
     WHERE e.docente_id = d.id AND e.activo = TRUE
     ORDER BY e.fecha DESC, e.created_at DESC
    LIMIT 1
  ) esc ON TRUE`;

// Compara el valor vigente de una columna de vinculación contra $N.
// Se resuelve con una subconsulta escalar en vez de EXISTS sobre un
// derivado: la versión con EXISTS duplicaba el nombre de la columna
// cuando se filtraba por `anio_vinculacion` ("SELECT v.anio_vinculacion,
// v.anio_vinculacion") y PostgreSQL la reportaba como ambigua.
const SQL_ALCANCE_VIGENTE = (columna) => `
  (
    SELECT v.${columna}
    FROM docente_vinculaciones v
    WHERE v.docente_id = d.id AND v.activo = TRUE
    ORDER BY v.anio_vinculacion DESC,
             COALESCE(v.fecha_vinculacion, DATE '1900-01-01') DESC,
             v.created_at DESC
    LIMIT 1
  ) = $N`;

// ============================================================
// Scope base reutilizado por listado, ficha y estadísticas.
// Devuelve el FROM + WHERE para que todas las consultas del
// módulo apliquen exactamente los mismos filtros.
// ============================================================
const construirScope = (filtros = {}, req = null) => {
  const params = [];
  const conditions = ['d.activo = TRUE'];

  const anadir = (valor) => {
    params.push(valor);
    return `$${params.length}`;
  };

  if (filtros.estado) conditions.push(`d.estado = ${anadir(filtros.estado)}`);
  if (filtros.area_enfoque) conditions.push(`d.area_enfoque = ${anadir(filtros.area_enfoque)}`);
  if (filtros.cargo) conditions.push(`d.cargo = ${anadir(filtros.cargo)}`);
  if (filtros.nivel_escalafon) conditions.push(`esc.nivel = ${anadir(filtros.nivel_escalafon)}`);
  if (filtros.categoria_escalafon) conditions.push(`esc.categoria = ${anadir(filtros.categoria_escalafon)}`);

  // Tipo de vinculación y año se resuelven contra la vinculación vigente,
  // no contra cualquier registro histórico.
  if (filtros.tipo_vinculacion) {
    conditions.push(SQL_ALCANCE_VIGENTE('tipo_vinculacion').replace('$N', anadir(filtros.tipo_vinculacion)));
  }
  if (filtros.dedicacion) {
    conditions.push(SQL_ALCANCE_VIGENTE('dedicacion').replace('$N', anadir(filtros.dedicacion)));
  }
  if (filtros.anio) {
    conditions.push(SQL_ALCANCE_VIGENTE('anio_vinculacion').replace('$N', Number(filtros.anio)));
  }

  if (filtros.busqueda) {
    const p = anadir(`%${filtros.busqueda}%`);
    conditions.push(
      `(d.nombre_completo ILIKE ${p} OR d.numero_docente ILIKE ${p} OR d.documento ILIKE ${p} OR d.area_enfoque ILIKE ${p} OR d.cargo ILIKE ${p})`
    );
  }

  if (req && soloSuPropiaFicha(req)) {
    conditions.push(`d.usuario_id = ${anadir(req.user.id)}`);
  }

  return {
    params,
    // El JOIN con usuarios es necesario porque SELECT_DOCENTE proyecta
    // `u.nombre` y `u.correo`; sin él la consulta del listado falla.
    from: `FROM docentes d
          LEFT JOIN usuarios u ON u.id = d.usuario_id
          ${SQL_VINCULACION_VIGENTE} ${SQL_ESCALAFON_VIGENTE}`,
    where: `WHERE ${conditions.join(' AND ')}`,
  };
};

const SELECT_DOCENTE = `
  SELECT d.*,
         vin.tipo_vinculacion, vin.dedicacion, vin.anio_vinculacion, vin.fecha_vinculacion,
         vin.tiempo_vinculacion, vin.horas_semanales, vin.acto_vinculacion,
         vin.acuerdo_hora_catedra,
         esc.nivel AS nivel_escalafon, esc.categoria AS categoria_escalafon,
         esc.categoria_investigador,
         u.nombre AS usuario_nombre, u.correo AS usuario_correo
  `;

// ============================================================
// GET /api/docentes
// ============================================================
const listar = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, tipo_vinculacion, area_enfoque, anio, nivel_escalafon, cargo, busqueda } = req.query;
    const limite = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const pagina = Math.max(parseInt(page, 10) || 1, 1);

    const scope = construirScope(
      { estado, tipo_vinculacion, area_enfoque, anio, nivel_escalafon, cargo, busqueda },
      req
    );

    const total = await pool.query(
      `SELECT COUNT(*)::int AS total ${scope.from} ${scope.where}`,
      scope.params
    );

    const params = [...scope.params, limite, (pagina - 1) * limite];
    const result = await pool.query(
      `${SELECT_DOCENTE},
              (SELECT COUNT(*)::int FROM docente_vinculaciones dv WHERE dv.docente_id = d.id AND dv.activo = TRUE) AS total_vinculaciones,
              (SELECT COUNT(*)::int FROM docente_formaciones df WHERE df.docente_id = d.id AND df.activo = TRUE) AS total_formaciones,
              (SELECT COUNT(*)::int FROM docente_evaluaciones de WHERE de.docente_id = d.id AND de.activo = TRUE) AS total_evaluaciones
       ${scope.from} ${scope.where}
       ORDER BY d.nombre_completo
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
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
    console.error('Error al listar docentes:', error);
    res.status(500).json({ message: 'Error al obtener docentes' });
  }
};

// ============================================================
// GET /api/docentes/opciones
// ============================================================
const opciones = async (req, res) => {
  try {
    // Las áreas se derivan de lo ya registrado: no se inventa taxonomía.
    const [areas, niveles, categorias, anios, factores, caracteristicas] = await Promise.all([
      pool.query("SELECT DISTINCT area_enfoque AS valor FROM docentes WHERE activo=TRUE AND area_enfoque IS NOT NULL AND btrim(area_enfoque) <> '' ORDER BY 1"),
      pool.query('SELECT DISTINCT nivel AS valor FROM docente_escalafones WHERE activo=TRUE ORDER BY 1'),
      pool.query('SELECT DISTINCT categoria AS valor FROM docente_escalafones WHERE activo=TRUE AND categoria IS NOT NULL ORDER BY 1'),
      pool.query('SELECT DISTINCT anio_vinculacion AS valor FROM docente_vinculaciones WHERE activo=TRUE ORDER BY 1 DESC'),
      // Factores y características alimentan los <select> del formulario de
      // evidencias: reutiliza el catálogo ya existente en lugar de duplicarlo.
      pool.query('SELECT id, codigo, nombre FROM factores ORDER BY codigo'),
      pool.query('SELECT id, codigo, nombre, factor_id FROM caracteristicas ORDER BY codigo'),
    ]);
    res.json({
      ...OPCIONES,
      AREAS: areas.rows.map((r) => r.valor),
      NIVELES: niveles.rows.map((r) => r.valor),
      CATEGORIAS: categorias.rows.map((r) => r.valor),
      ANIOS: anios.rows.map((r) => r.valor),
      FACTORES: factores.rows,
      CARACTERISTICAS: caracteristicas.rows,
    });
  } catch (error) {
    console.error('Error al obtener opciones de docentes:', error);
    res.status(500).json({ message: 'Error al obtener catálogos de docentes' });
  }
};

// ============================================================
// GET /api/docentes/estadisticas
// ============================================================
const estadisticas = async (req, res) => {
  try {
    const { anio, periodo, tipo_vinculacion, area_enfoque } = req.query;
    const filtros = { anio, tipo_vinculacion, area_enfoque };
    const scope = construirScope(filtros, req);
    const { from, where, params } = scope;

    // Los filtros de año/periodo aplican a las tablas hijas, no a la vinculación.
    // Cada filtro construye su PROPIA lista de parámetros a partir de `params`:
    // compartir un array mutable haría que unas consultas recibieran parámetros
    // de más y PostgreSQL rechazara el bind.
    // Ojo: la columna de año y la existencia de `periodo` varían por tabla.
    // `docente_formaciones` guarda `anio_graduacion` y no tiene `periodo`.
    const filtroHijo = (columnaAnio, usaPeriodo) => {
      const p = [...params];
      const c = [];
      if (anio && columnaAnio) {
        p.push(Number(anio));
        c.push(`hijo.${columnaAnio} = $${p.length}`);
      }
      if (periodo && usaPeriodo) {
        p.push(periodo);
        c.push(`hijo.periodo = $${p.length}`);
      }
      return { sql: c.join(' AND '), params: p };
    };

    const filtroFormacion = filtroHijo('anio_graduacion', false);
    const filtroAnioPeriodo = filtroHijo('anio', true);

    // Docentes que pasan el scope, usados como universo para las tablas hijas.
    const universo = `SELECT d.id ${from} ${where}`;

    const [totales, porTipoVinculacion, porArea, porDedicacion, evolucion, porNivelFormacion,
      porAnioEvaluacion, porTipoEvaluacion, redes, mejoramientos, estadosEvaluacion] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE vin.tipo_vinculacion = 'Tiempo completo')::int AS tiempo_completo,
           COUNT(*) FILTER (WHERE vin.tipo_vinculacion = 'Hora cátedra')::int AS hora_catedra,
           COUNT(*) FILTER (WHERE vin.tipo_vinculacion = 'Medio tiempo')::int AS medio_tiempo,
           COUNT(*) FILTER (WHERE vin.tipo_vinculacion IS NULL)::int AS sin_vinculacion,
           COUNT(*) FILTER (WHERE esc.nivel IS NOT NULL)::int AS con_escalafon,
           COUNT(*) FILTER (WHERE esc.categoria_investigador IS NOT NULL)::int AS con_categoria_investigador
         ${from} ${where}`,
        params
      ),
      pool.query(
        `SELECT COALESCE(vin.tipo_vinculacion, 'Sin registro') AS etiqueta, COUNT(*)::int AS total
         ${from} ${where}
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT COALESCE(d.area_enfoque, 'Sin área registrada') AS etiqueta, COUNT(*)::int AS total
         ${from} ${where}
         GROUP BY 1 ORDER BY total DESC LIMIT 12`,
        params
      ),
      pool.query(
        `SELECT COALESCE(vin.dedicacion, 'Sin registro') AS etiqueta, COUNT(*)::int AS total
         ${from} ${where}
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT vin.anio_vinculacion AS anio, COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE vin.tipo_vinculacion = 'Tiempo completo')::int AS tiempo_completo,
                COUNT(*) FILTER (WHERE vin.tipo_vinculacion = 'Hora cátedra')::int AS hora_catedra
         ${from} ${where}
         AND vin.anio_vinculacion IS NOT NULL
         GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT COALESCE(hijo.nivel_formacion, 'Sin registro') AS etiqueta, COUNT(*)::int AS total
         FROM docente_formaciones hijo
         WHERE hijo.activo = TRUE AND hijo.docente_id IN (${universo})
         ${filtroFormacion.sql ? `AND ${filtroFormacion.sql}` : ''}
         GROUP BY 1 ORDER BY total DESC`,
        filtroFormacion.params
      ),
      pool.query(
        `SELECT hijo.anio, ROUND(AVG(hijo.resultado), 2) AS promedio, COUNT(*)::int AS total
         FROM docente_evaluaciones hijo
         WHERE hijo.activo = TRUE AND hijo.resultado IS NOT NULL AND hijo.docente_id IN (${universo})
         ${filtroAnioPeriodo.sql ? `AND ${filtroAnioPeriodo.sql}` : ''}
         GROUP BY 1 ORDER BY 1`,
        filtroAnioPeriodo.params
      ),
      pool.query(
        `SELECT hijo.evaluador AS etiqueta, ROUND(AVG(hijo.resultado), 2) AS promedio,
                COUNT(*)::int AS total
         FROM docente_evaluaciones hijo
         WHERE hijo.activo = TRUE AND hijo.docente_id IN (${universo})
         GROUP BY 1 ORDER BY total DESC`,
        params
      ),
      pool.query(
        `SELECT COUNT(DISTINCT hijo.docente_id)::int AS docentes_participantes,
                COUNT(DISTINCT hijo.red_id)::int AS redes,
                COUNT(*)::int AS participaciones
         FROM docente_redes hijo
         WHERE hijo.activo = TRUE AND hijo.docente_id IN (${universo})`,
        params
      ),
      pool.query(
        `SELECT hijo.estado AS etiqueta, COUNT(*)::int AS total
         FROM docente_planes_mejoramiento hijo
         WHERE hijo.activo = TRUE AND hijo.docente_id IN (${universo})
         GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT 'Estudiantes' AS etiqueta, ROUND(AVG(hijo.resultado) FILTER (WHERE hijo.evaluador='Estudiantes'), 2) AS promedio, COUNT(*) FILTER (WHERE hijo.evaluador='Estudiantes')::int AS total FROM docente_evaluaciones hijo WHERE hijo.activo=TRUE AND hijo.docente_id IN (${universo})
         UNION ALL
         SELECT 'Autoevaluación', ROUND(AVG(hijo.resultado) FILTER (WHERE hijo.evaluador='Autoevaluación'), 2), COUNT(*) FILTER (WHERE hijo.evaluador='Autoevaluación')::int FROM docente_evaluaciones hijo WHERE hijo.activo=TRUE AND hijo.docente_id IN (${universo})
         UNION ALL
         SELECT 'Colegas', ROUND(AVG(hijo.resultado) FILTER (WHERE hijo.evaluador='Colegas'), 2), COUNT(*) FILTER (WHERE hijo.evaluador='Colegas')::int FROM docente_evaluaciones hijo WHERE hijo.activo=TRUE AND hijo.docente_id IN (${universo})
         UNION ALL
         SELECT 'Jefes', ROUND(AVG(hijo.resultado) FILTER (WHERE hijo.evaluador='Jefes'), 2), COUNT(*) FILTER (WHERE hijo.evaluador='Jefes')::int FROM docente_evaluaciones hijo WHERE hijo.activo=TRUE AND hijo.docente_id IN (${universo})
         UNION ALL
         SELECT 'Externas', ROUND(AVG(hijo.resultado) FILTER (WHERE hijo.evaluador='Externas'), 2), COUNT(*) FILTER (WHERE hijo.evaluador='Externas')::int FROM docente_evaluaciones hijo WHERE hijo.activo=TRUE AND hijo.docente_id IN (${universo})`,
        params
      ),
    ]);

    res.json({
      filtros: { anio: anio ? Number(anio) : null, periodo: periodo || null, tipo_vinculacion: tipo_vinculacion || null, area_enfoque: area_enfoque || null },
      totales: totales.rows[0],
      porTipoVinculacion: porTipoVinculacion.rows,
      porArea: porArea.rows,
      porDedicacion: porDedicacion.rows,
      evolucion: evolucion.rows,
      porNivelFormacion: porNivelFormacion.rows,
      porAnioEvaluacion: porAnioEvaluacion.rows,
      porTipoEvaluacion: porTipoEvaluacion.rows,
      resultadosEvaluacion: estadosEvaluacion.rows,
      redes: redes.rows[0],
      mejoramientos: mejoramientos.rows,
    });
  } catch (error) {
    console.error('Error en estadísticas de docentes:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de docentes' });
  }
};

// ============================================================
// POST /api/docentes/indicadores/sincronizar
// Reutiliza la tabla `indicadores` ya existente en SISACRE en vez
// de crear una segunda. Los valores salen de agregaciones reales
// sobre las tablas del módulo, nunca de datos ficticios.
// ============================================================
const sincronizarIndicadores = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: factor } = await client.query("SELECT id FROM factores WHERE codigo = 'F3'");
    if (factor.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'El factor F3 no está registrado en la tabla factores' });
    }
    const factorId = factor[0].id;

    const anios = await client.query(
      `SELECT DISTINCT anio_vinculacion AS anio FROM docente_vinculaciones WHERE activo = TRUE AND anio_vinculacion IS NOT NULL ORDER BY 1`
    );

    let insertados = 0;
    for (const { anio } of anios.rows) {
      const valores = await client.query(
        `SELECT
           (SELECT COUNT(DISTINCT v.docente_id)::int FROM docente_vinculaciones v
             WHERE v.activo = TRUE AND v.anio_vinculacion = $1) AS num_docentes,
           (SELECT COUNT(DISTINCT v.docente_id)::int FROM docente_vinculaciones v
             WHERE v.activo = TRUE AND v.anio_vinculacion = $1 AND v.tipo_vinculacion = 'Tiempo completo') AS num_tiempo_completo,
           (SELECT COUNT(DISTINCT v.docente_id)::int FROM docente_vinculaciones v
             WHERE v.activo = TRUE AND v.anio_vinculacion = $1 AND v.tipo_vinculacion = 'Hora cátedra') AS num_hora_catedra,
           (SELECT COUNT(DISTINCT e.docente_id)::int FROM docente_evaluaciones e
             WHERE e.activo = TRUE AND e.anio = $1) AS num_docentes_evaluados,
            (SELECT ROUND(AVG(e.resultado), 2) FROM docente_evaluaciones e
              WHERE e.activo = TRUE AND e.anio = $1 AND e.resultado IS NOT NULL) AS promedio_evaluacion`,
        [anio]
      );
      const v = valores.rows[0];

      const indicadores = [
        ['Número de docentes', v.num_docentes, 'docentes'],
        ['Número de docentes de tiempo completo', v.num_tiempo_completo, 'docentes'],
        ['Número de docentes de hora cátedra', v.num_hora_catedra, 'docentes'],
        ['Número de docentes evaluados', v.num_docentes_evaluados, 'docentes'],
        ['Promedio de evaluación docente', v.promedio_evaluacion, 'puntaje'],
      ];

      for (const [nombre, valor, unidad] of indicadores) {
        if (valor === null) continue;
        await client.query(
          `INSERT INTO indicadores (factor_id, nombre, valor_actual, unidad, anio, semestre, descripcion)
           VALUES ($1, $2, $3, $4, $5, 'Anual', $6)
           ON CONFLICT (factor_id, nombre, anio, COALESCE(semestre, 'Anual'))
           DO UPDATE SET valor_actual = EXCLUDED.valor_actual, updated_at = NOW()`,
          [factorId, nombre, valor, unidad, anio, 'Indicador calculado automáticamente desde el módulo Docentes']
        );
        insertados += 1;
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Indicadores del Factor 3 sincronizados',
      factor_id: factorId,
      registros: insertados,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al sincronizar indicadores:', error);
    res.status(500).json({ message: 'Error al sincronizar indicadores' });
  } finally {
    client.release();
  }
};

// ============================================================
// GET /api/docentes/:id/historico
// Línea de tiempo construida con UNION sobre las 9 tablas de
// histórico. No hay tabla de histórico: se deriva, de modo que
// no puede quedar desincronizada de los datos reales.
// ============================================================
const historico = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await verificarAccesoFicha(req, res, id))) return;

    // No se filtra por `activo`: un registro con borrado lógico sigue
    // formando parte de la trayectoria y debe seguir siendo auditable. Se
    // marca con `activo` para que la interfaz lo distinga.
    const result = await pool.query(
      `SELECT * FROM (
         SELECT 'Vinculación' AS categoria, v.anio_vinculacion AS anio, v.created_at AS fecha,
                COALESCE(v.tipo_vinculacion, '') AS titulo,
                COALESCE(v.dedicacion, '') || COALESCE(' · ' || v.acto_vinculacion, '') AS detalle,
                v.id AS registro_id, v.observaciones, v.activo
         FROM docente_vinculaciones v
         WHERE v.docente_id = $1

         UNION ALL
         SELECT 'Escalafón', EXTRACT(YEAR FROM e.fecha)::int, e.created_at,
                e.nivel || COALESCE(' - Categoría ' || e.categoria, ''),
                COALESCE(e.acto_ascenso, ''), e.id, e.observaciones, e.activo
         FROM docente_escalafones e
         WHERE e.docente_id = $1

         UNION ALL
         SELECT 'Formación', f.anio_graduacion, f.created_at,
                f.nivel_formacion || ' · ' || f.titulo,
                COALESCE(f.institucion, ''), f.id, f.observaciones, f.activo
         FROM docente_formaciones f
         WHERE f.docente_id = $1

         UNION ALL
         SELECT 'Evaluación', ev.anio, ev.created_at,
                COALESCE(ev.tipo_evaluacion || ' · ', '') || ev.evaluador || COALESCE(' · ' || ev.periodo, ''),
                COALESCE('Resultado: ' || ev.resultado::text, ''), ev.id, ev.observaciones, ev.activo
         FROM docente_evaluaciones ev
         WHERE ev.docente_id = $1

         UNION ALL
         SELECT 'Plan de mejoramiento', m.anio, m.created_at, m.plan,
                COALESCE('Estado: ' || m.estado, ''), m.id, m.observaciones, m.activo
         FROM docente_planes_mejoramiento m
         WHERE m.docente_id = $1

         UNION ALL
         SELECT 'Red académica', r.anio_inicio, r.created_at, ra.nombre,
                COALESCE(r.tipo_participacion, ''), r.id, r.observaciones, r.activo
         FROM docente_redes r
         JOIN redes_academicas ra ON ra.id = r.red_id
         WHERE r.docente_id = $1
       ) h
       ORDER BY h.anio DESC NULLS LAST, h.fecha DESC`,
      [id]
    );

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error al obtener histórico del docente:', error);
    res.status(500).json({ message: 'Error al obtener el histórico' });
  }
};

// ============================================================
// GET /api/docentes/:id
// ============================================================
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `${SELECT_DOCENTE}
       FROM docentes d ${SQL_VINCULACION_VIGENTE} ${SQL_ESCALAFON_VIGENTE}
       LEFT JOIN usuarios u ON u.id = d.usuario_id
       WHERE d.id = $1 AND d.activo = TRUE`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Docente no encontrado' });

    const docente = result.rows[0];
    if (soloSuPropiaFicha(req) && docente.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'Acceso denegado: solo puede consultar su propia ficha' });
    }

    // Contadores por dominio: el perfil los muestra en las pestañas
    // sin necesidad de descargar cada colección por separado.
    const [conteos, areas] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM docente_vinculaciones WHERE docente_id=$1 AND activo=TRUE) AS vinculaciones,
           (SELECT COUNT(*)::int FROM docente_formaciones WHERE docente_id=$1 AND activo=TRUE) AS formaciones,
           (SELECT COUNT(*)::int FROM docente_escalafones WHERE docente_id=$1 AND activo=TRUE) AS escalafones,
           (SELECT COUNT(*)::int FROM docente_evaluaciones WHERE docente_id=$1 AND activo=TRUE) AS evaluaciones,
           (SELECT COUNT(*)::int FROM docente_planes_mejoramiento WHERE docente_id=$1 AND activo=TRUE) AS mejoramientos,
           (SELECT COUNT(*)::int FROM docente_redes WHERE docente_id=$1 AND activo=TRUE) AS redes,
           (SELECT COUNT(DISTINCT red_id)::int FROM docente_redes WHERE docente_id=$1 AND activo=TRUE) AS redes_distintas`,
        [id]
      ),
      pool.query(
        `SELECT DISTINCT d.area_enfoque AS valor FROM docentes d
         WHERE d.activo = TRUE AND d.area_enfoque IS NOT NULL
           AND d.id IN (SELECT docente_id FROM docente_vinculaciones WHERE docente_id = $1)
         ORDER BY 1`,
        [id]
      ),
    ]);

    res.json({ ...docente, conteos: conteos.rows[0] });
  } catch (error) {
    console.error('Error al obtener docente:', error);
    res.status(500).json({ message: 'Error al obtener docente' });
  }
};

// ============================================================
// POST /api/docentes
// ============================================================
const crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      numero_docente, nombre_completo, documento, correo, telefono, cargo,
      area_enfoque, estado, usuario_id, observaciones
    } = req.body;

    // El formulario ya no pide "número docente": se toma del documento
    // (cédula). Si el cliente aún lo envía, se respeta ese valor.
    const numeroDocente = (numero_docente && String(numero_docente).trim())
      || (documento && String(documento).trim());
    if (!numeroDocente) {
      return res.status(400).json({ message: 'El documento (cédula) es obligatorio para registrar al docente' });
    }
    if (!nombre_completo || !String(nombre_completo).trim()) {
      return res.status(400).json({ message: 'El nombre completo es obligatorio' });
    }
    if (estado && !OPCIONES.ESTADOS.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${OPCIONES.ESTADOS.join(', ')}` });
    }

    // Vinculación inicial opcional. Se crea en la misma transacción para
    // que el docente no quede sin tipo de vinculación si el usuario la envió.
    const vinculacion = req.body.vinculacion;

    await client.query('BEGIN');

    const docente = await client.query(
      `INSERT INTO docentes (
         numero_docente, nombre_completo, documento, correo, telefono, cargo,
         area_enfoque, estado, usuario_id, observaciones
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        numeroDocente, String(nombre_completo).trim(),
        documento || null, correo || null, telefono || null, cargo || null,
        area_enfoque || null, estado || 'Activo', usuario_id || null, observaciones || null
      ]
    );
    const docenteId = docente.rows[0].id;

    if (vinculacion && vinculacion.tipo_vinculacion) {
      if (!OPCIONES.TIPOS_VINCULACION.includes(vinculacion.tipo_vinculacion)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Tipo de vinculación inválido. Valores permitidos: ${OPCIONES.TIPOS_VINCULACION.join(', ')}` });
      }
      const anioVinculacion = vinculacion.anio_vinculacion || new Date().getFullYear();
      await client.query(
        `INSERT INTO docente_vinculaciones (
           docente_id, anio_vinculacion, fecha_vinculacion, tipo_vinculacion, dedicacion,
           tiempo_vinculacion, horas_semanales, acto_vinculacion, observaciones, registrado_por
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          docenteId, anioVinculacion, vinculacion.fecha_vinculacion || null,
          vinculacion.tipo_vinculacion, vinculacion.dedicacion || null,
          vinculacion.tiempo_vinculacion || null, vinculacion.horas_semanales || null,
          vinculacion.acto_vinculacion || null, vinculacion.observaciones || null, req.user.id
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Docente creado exitosamente', id: docenteId });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const detalle = error.constraint === 'docentes_usuario_id_key'
        ? 'Ya existe un docente vinculado a esa cuenta de usuario'
        : 'El número de docente ya está registrado';
      return res.status(400).json({ message: detalle });
    }
    if (error.code === '23514') return res.status(400).json({ message: 'Alguno de los valores enviados no es válido' });
    console.error('Error al crear docente:', error);
    res.status(500).json({ message: 'Error al crear docente' });
  } finally {
    client.release();
  }
};

// ============================================================
// PUT /api/docentes/:id
// Actualización parcial: solo se escriben las columnas presentes en el
// cuerpo. Así el frontend puede enviar "lo que cambió" desde la pestaña
// de información, y un campo se puede vaciar enviando null o ''.
// Con COALESCE no se podría limpiar nunca una columna.
// ============================================================
const CAMPOS_EDITABLES = [
  'numero_docente', 'nombre_completo', 'documento', 'correo', 'telefono',
  'cargo', 'area_enfoque', 'estado', 'usuario_id', 'observaciones',
];

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;

    const asignaciones = [];
    const valores = [];
    for (const campo of CAMPOS_EDITABLES) {
      if (!(campo in req.body)) continue;
      let valor = req.body[campo];
      if (typeof valor === 'string') valor = valor.trim();
      // '' significa "quitar el valor", igual que null.
      if (valor === '') valor = null;
      valores.push(valor);
      asignaciones.push(`${campo} = $${valores.length}`);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({ message: 'No se envió ningún campo para actualizar' });
    }

    // Solo se exige un valor cuando el cliente intenta cambiar esos campos.
    if ('numero_docente' in req.body && !req.body.numero_docente) {
      return res.status(400).json({ message: 'El número de docente no puede quedar vacío' });
    }
    if ('nombre_completo' in req.body && !req.body.nombre_completo) {
      return res.status(400).json({ message: 'El nombre completo no puede quedar vacío' });
    }
    if (req.body.estado && !OPCIONES.ESTADOS.includes(req.body.estado)) {
      return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${OPCIONES.ESTADOS.join(', ')}` });
    }

    valores.push(id);
    const result = await pool.query(
      `UPDATE docentes SET ${asignaciones.join(', ')}, updated_at = NOW()
        WHERE id = $${valores.length} AND activo = TRUE RETURNING id`,
      valores
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Docente no encontrado' });
    res.json({ message: 'Docente actualizado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'El número de docente ya está registrado' });
    if (error.code === '23514') return res.status(400).json({ message: 'Alguno de los valores enviados no es válido' });
    console.error('Error al actualizar docente:', error);
    res.status(500).json({ message: 'Error al actualizar docente' });
  }
};

// ============================================================
// DELETE /api/docentes/:id
// Eliminación lógica (activo = FALSE), igual que documentos y
// proyectos. El histórico de sus tablas hijas se conserva.
// ============================================================
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE docentes SET activo=FALSE, updated_at=NOW() WHERE id=$1 AND activo=TRUE RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Docente no encontrado' });
    res.json({ message: 'Docente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    res.status(500).json({ message: 'Error al eliminar docente' });
  }
};

// ============================================================
// GET /api/docentes/:id/documentos
// Evidencias asociadas por dos vías:
//   1. documento_id enlazado desde cada registro de dominio
//   2. documentos del Factor 3 cuyo campo `responsable`
//      corresponde al docente (lógica preexistente del módulo)
// ============================================================
const listarDocumentos = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await verificarAccesoFicha(req, res, id))) return;

    // El enlace de evidencia es dinámico: se comprueba en information_schema
    // qué tablas de dominio tienen columna `documento_id` antes de construir
    // la UNION. Así, si el esquema de un dominio cambia, la consulta sigue
    // siendo válida en lugar de fallar con "column does not exist".
    const tablasConDocumento = await pool.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'documento_id'
          AND table_name = ANY($1::text[])`,
      [Object.values(ORIGENES).map(c => c.tabla)]
    );
    const tablasValidas = new Set(tablasConDocumento.rows.map(r => r.table_name));

    const origenes = Object.entries(ORIGENES)
      .filter(([, cfg]) => tablasValidas.has(cfg.tabla))
      .map(([clave, cfg]) =>
        `SELECT documento_id, '${clave}' AS origen, '${cfg.etiqueta}' AS etiqueta, id AS registro_id
         FROM ${cfg.tabla} WHERE docente_id = $1 AND activo = TRUE AND documento_id IS NOT NULL`)
      .join(' UNION ALL ');

    const result = await pool.query(
      // `tipo_mime` no existe en `documentos`: el archivo vive en
      // `versiones_documento`, así que se toma de la versión actual.
      `SELECT DISTINCT ON (d.id)
              d.id, d.titulo, d.descripcion, d.anio, d.semestre, d.responsable, d.created_at,
              f.codigo AS factor_codigo, f.nombre AS factor_nombre,
              c.codigo AS caracteristica_codigo,
              te.nombre AS tipo_evidencia,
              e.origen, e.etiqueta AS origen_etiqueta, e.registro_id,
              (SELECT v.nombre_original FROM versiones_documento v
                WHERE v.documento_id = d.id
                ORDER BY v.es_version_actual DESC, v.version_numero DESC LIMIT 1) AS nombre_original,
              (SELECT v.tipo_mime FROM versiones_documento v
                WHERE v.documento_id = d.id
                ORDER BY v.es_version_actual DESC, v.version_numero DESC LIMIT 1) AS tipo_mime,
              (SELECT v.tamanio_bytes FROM versiones_documento v
                WHERE v.documento_id = d.id
                ORDER BY v.es_version_actual DESC, v.version_numero DESC LIMIT 1) AS tamanio_bytes
       FROM documentos d
       LEFT JOIN factores f ON f.id = d.factor_id
       LEFT JOIN caracteristicas c ON c.id = d.caracteristica_id
       LEFT JOIN tipos_evidencia te ON te.id = d.tipo_evidencia_id
       JOIN (${origenes}
             UNION ALL
             SELECT d2.id, 'docente', 'Evidencia general del docente', NULL
             FROM documentos d2
             WHERE d2.activo = TRUE AND d2.docente_id = $1
       ) e ON e.documento_id = d.id
       WHERE d.activo = TRUE
       ORDER BY d.id, d.anio DESC, d.created_at DESC`,
      [id]
    );

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error al listar documentos del docente:', error);
    res.status(500).json({ message: 'Error al obtener documentos del docente' });
  }
};

// ============================================================
// POST /api/docentes/:id/documentos
// Crea un documento dentro del Factor 3 reutilizando Multer, la
// tabla `documentos` y su versionado.
//
// Dos modos, ambos válidos:
//   1. Evidencia general: sin `origen`. Queda vinculada al docente por
//      `documentos.docente_id`.
//   2. Evidencia de un registro: con `origen` + `registro_id`. Se guarda
//      el documento en el registro de dominio (`*.documento_id`), que es
//      el vínculo que usa el histórico.
// ============================================================
const crearDocumento = async (req, res) => {
  const client = await pool.connect();
  const descartarArchivo = () => {
    try {
      const fs = require('fs');
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) { /* el archivo ya no está: no debe romper la respuesta */ }
  };

  try {
    const { id } = req.params;
    const { origen, registro_id, titulo, descripcion, anio, semestre, responsable,
      factor_id, caracteristica_id, tipo_evidencia_id, notas_version } = req.body;

    if (!req.file) return res.status(400).json({ message: 'Debe adjuntar un archivo' });
    if (!titulo || !titulo.trim()) {
      descartarArchivo();
      return res.status(400).json({ message: 'El título del documento es obligatorio' });
    }

    // `origen` es opcional: su ausencia significa "evidencia general".
    // Si viene, tiene que existir en la lista blanca.
    let cfg = null;
    if (origen) {
      cfg = ORIGENES[origen];
      if (!cfg) {
        descartarArchivo();
        return res.status(400).json({ message: `Origen inválido. Valores permitidos: ${Object.keys(ORIGENES).join(', ')}` });
      }
    }

    const docente = await client.query('SELECT id, nombre_completo, usuario_id FROM docentes WHERE id=$1 AND activo=TRUE', [id]);
    if (docente.rows.length === 0) {
      descartarArchivo();
      return res.status(404).json({ message: 'Docente no encontrado' });
    }
    // El rol `docente` sí puede subir evidencia, pero únicamente a su
    // propia ficha: se compara contra `docentes.usuario_id`, no contra el
    // id de la ruta (que es el id del docente, no el del usuario).
    if (soloSuPropiaFicha(req) && docente.rows[0].usuario_id !== req.user.id) {
      descartarArchivo();
      return res.status(403).json({ message: 'Solo puede cargar evidencias en su propia ficha' });
    }

    const anioDoc = anio || new Date().getFullYear();

    await client.query('BEGIN');

    // El factor se toma del body si viene; si no, por defecto el F3.
    let factorId = factor_id ? Number(factor_id) : null;
    if (!factorId) {
      const factor = await client.query("SELECT id FROM factores WHERE codigo='F3'");
      factorId = factor.rows.length ? factor.rows[0].id : null;
    }
    let caracteristicaId = caracteristica_id ? Number(caracteristica_id) : null;
    if (!caracteristicaId && cfg) {
      const caracteristica = await client.query(
        "SELECT id FROM caracteristicas WHERE factor_id=(SELECT id FROM factores WHERE codigo='F3') AND codigo=$1",
        [cfg.caracteristica]
      );
      caracteristicaId = caracteristica.rows.length ? caracteristica.rows[0].id : null;
    }

    const doc = await client.query(
      `INSERT INTO documentos (
         titulo, descripcion, factor_id, caracteristica_id, tipo_evidencia_id,
         anio, semestre, responsable, docente_id, subido_por
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        titulo.trim(), descripcion || null, factorId, caracteristicaId,
        tipo_evidencia_id ? Number(tipo_evidencia_id) : null, Number(anioDoc), semestre || 'Anual',
        responsable || docente.rows[0].nombre_completo, id, req.user.id
      ]
    );
    const documentoId = doc.rows[0].id;

    await client.query(
      `INSERT INTO versiones_documento (
         documento_id, version_numero, nombre_archivo, nombre_original, ruta_archivo,
         tipo_mime, tamanio_bytes, es_version_actual, subido_por, notas_version
       ) VALUES ($1,1,$2,$3,$4,$5,$6,TRUE,$7,$8)`,
      [
        documentoId, req.file.filename, req.file.originalname, req.file.path,
        req.file.mimetype, req.file.size, req.user.id,
        notas_version || (cfg ? `Evidencia de ${cfg.etiqueta}` : 'Evidencia general del docente')
      ]
    );

    let enlazado = false;
    if (cfg && registro_id) {
      const upd = await client.query(
        `UPDATE ${cfg.tabla} SET documento_id = $1, updated_at = NOW() WHERE id = $2 AND docente_id = $3`,
        [documentoId, registro_id, id]
      );
      enlazado = upd.rowCount > 0;
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Evidencia cargada exitosamente',
      id: documentoId,
      enlazada: enlazado,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) { /* la transacción ya podía no existir */ }
    console.error('Error al crear documento del docente:', error);
    res.status(500).json({ message: 'Error al crear la evidencia' });
  } finally {
    client.release();
  }
};

module.exports = {
  listar, obtener, crear, actualizar, eliminar, opciones, estadisticas,
  historico, listarDocumentos, crearDocumento, sincronizarIndicadores,
  verificarAccesoFicha, soloSuPropiaFicha,
  OPCIONES, ORIGENES,
};
