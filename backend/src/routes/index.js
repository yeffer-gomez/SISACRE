const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const authCtrl = require('../controllers/auth.controller');
const docCtrl = require('../controllers/documentos.controller');
const usuariosCtrl = require('../controllers/usuarios.controller');
const facCtrl = require('../controllers/factores.controller');
const proyCtrl = require('../controllers/proyectos.controller');
const docentesCtrl = require('../controllers/docentes.controller');
const docenteRegCtrl = require('../controllers/docente-registros.controller');
const egresadosCtrl = require('../controllers/egresados.controller');
const egresadoRegCtrl = require('../controllers/egresado-registros.controller');

// ── Auth ─────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authenticate, authorize('administrador'), authCtrl.register);
router.get('/auth/me', authenticate, authCtrl.me);

// ── Factores ──────────────────────────────────────────────────────
router.get('/factores', authenticate, facCtrl.listar);
router.get('/factores/:id', authenticate, facCtrl.obtener);
router.post('/factores', authenticate, authorize('administrador', 'coordinador'), facCtrl.crear);
router.put('/factores/:id', authenticate, authorize('administrador', 'coordinador'), facCtrl.actualizar);
router.get('/factores/:id/caracteristicas', authenticate, facCtrl.listarCaracteristicas);
router.post('/factores/:id/caracteristicas', authenticate, authorize('administrador', 'coordinador'), facCtrl.crearCaracteristica);

// ── Tipos de Evidencia ────────────────────────────────────────────
router.get('/tipos-evidencia', authenticate, facCtrl.listarTipos);

// ── Documentos ────────────────────────────────────────────────────
router.get('/documentos/estadisticas', authenticate, docCtrl.estadisticas);
router.get('/documentos', authenticate, docCtrl.listar);
router.get('/documentos/:id', authenticate, docCtrl.obtener);
router.post('/documentos', authenticate, upload.single('archivo'), docCtrl.crear);
router.put('/documentos/:id', authenticate, docCtrl.actualizar);
router.delete('/documentos/:id', authenticate, authorize('administrador', 'coordinador'), docCtrl.eliminar);
router.post('/documentos/:id/versiones', authenticate, upload.single('archivo'), docCtrl.nuevaVersion);
router.get('/documentos/:id/descargar', authenticate, docCtrl.descargar);
router.get('/documentos/:id/visualizar', authenticate, docCtrl.visualizar);

// ── Usuarios ──────────────────────────────────────────────────────
router.get('/usuarios', authenticate, authorize('administrador'), usuariosCtrl.listar);
router.put('/usuarios/:id/roles', authenticate, authorize('administrador'), usuariosCtrl.asignarRoles);
router.put('/usuarios/:id/estado', authenticate, authorize('administrador'), usuariosCtrl.cambiarEstado);
router.get('/roles', authenticate, usuariosCtrl.listarRoles);

// ── Proyectos de Investigación ────────────────────────────────────
router.get('/proyectos/opciones', authenticate, proyCtrl.opciones);
router.get('/proyectos/estadisticas', authenticate, proyCtrl.estadisticas);
router.get('/proyectos', authenticate, proyCtrl.listar);
router.get('/proyectos/:id', authenticate, proyCtrl.obtener);
router.post('/proyectos', authenticate, proyCtrl.crear);
router.put('/proyectos/:id', authenticate, proyCtrl.actualizar);
router.delete('/proyectos/:id', authenticate, authorize('administrador', 'coordinador'), proyCtrl.eliminar);

// ── Redes académicas (catálogo compartido por todos los docentes) ──
// Prefijo propio, no /docentes/:id, para no colisionar con el id del docente.
router.get('/redes-academicas', authenticate, docenteRegCtrl.listarRedes);
router.post('/redes-academicas', authenticate, authorize('administrador', 'coordinador'), docenteRegCtrl.crearRed);
router.put('/redes-academicas/:id', authenticate, authorize('administrador', 'coordinador'), docenteRegCtrl.actualizarRed);

// ── Docentes — Factor 3: Profesores ───────────────────────────────
// Orden importante: las rutas literales se declaran antes que
// `/docentes/:id` y antes que `/docentes/:id/:dominio`, para que
// "estadisticas" u "historico" no se interpreten como un id.
router.get('/docentes/opciones', authenticate, docentesCtrl.opciones);
router.get('/docentes/esquemas', authenticate, docenteRegCtrl.esquemas);
// Las estadísticas son agregadas de toda la universidad, no datos de una
// ficha concreta: el rol `docente` queda fuera para no exponer el
// desempeño del resto del cuerpo docente.
router.get('/docentes/estadisticas', authenticate, authorize('administrador', 'coordinador', 'evaluador'), docentesCtrl.estadisticas);
router.post('/docentes/indicadores/sincronizar', authenticate, authorize('administrador', 'coordinador'), docentesCtrl.sincronizarIndicadores);

router.get('/docentes', authenticate, docentesCtrl.listar);
router.post('/docentes', authenticate, authorize('administrador', 'coordinador'), docentesCtrl.crear);
router.get('/docentes/:id', authenticate, docentesCtrl.obtener);
router.put('/docentes/:id', authenticate, authorize('administrador', 'coordinador'), docentesCtrl.actualizar);
router.delete('/docentes/:id', authenticate, authorize('administrador', 'coordinador'), docentesCtrl.eliminar);

router.get('/docentes/:id/historico', authenticate, docentesCtrl.historico);
router.get('/docentes/:id/documentos', authenticate, docentesCtrl.listarDocumentos);
// El rol `docente` también puede subir evidencia, pero el controlador
// comprueba que `docentes.usuario_id` coincida con el usuario autenticado,
// de modo que no puede cargarla en la ficha de otro.
router.post('/docentes/:id/documentos', authenticate, authorize('administrador', 'coordinador', 'docente'), upload.single('archivo'), docentesCtrl.crearDocumento);

// Los 6 dominios históricos: vinculaciones, formaciones, escalafones,
// evaluaciones, mejoramientos y redes. El nombre del dominio se valida
// contra una lista blanca en el controller antes de tocar cualquier tabla.
router.get('/docentes/:id/:dominio', authenticate, docenteRegCtrl.listarRegistros);
router.post('/docentes/:id/:dominio', authenticate, authorize('administrador', 'coordinador'), docenteRegCtrl.crearRegistro);
router.put('/docentes/:id/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), docenteRegCtrl.actualizarRegistro);
router.delete('/docentes/:id/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), docenteRegCtrl.eliminarRegistro);

// ── Egresados — Factor 4 ──────────────────────────────────────────
// Igual que en Docentes, las rutas literales se declaran antes que
// `/egresados/:id`. El prefijo `/egresados/catalogo/:dominio` (políticas
// y formación continua) también va antes para que "catalogo" no se lea
// como el id de un egresado.
router.get('/egresados/opciones', authenticate, egresadosCtrl.opciones);
router.get('/egresados/esquemas', authenticate, egresadoRegCtrl.esquemas);
router.get('/egresados/estadisticas', authenticate, egresadosCtrl.estadisticas);

// Catálogos globales (no dependen de un egresado).
router.get('/egresados/catalogo/:dominio', authenticate, egresadoRegCtrl.listarCatalogo);
router.post('/egresados/catalogo/:dominio', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.crearCatalogo);
router.put('/egresados/catalogo/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.actualizarCatalogo);
router.delete('/egresados/catalogo/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.eliminarCatalogo);

router.get('/egresados', authenticate, egresadosCtrl.listar);
router.post('/egresados', authenticate, authorize('administrador', 'coordinador'), egresadosCtrl.crear);
router.get('/egresados/:id', authenticate, egresadosCtrl.obtener);
router.put('/egresados/:id', authenticate, authorize('administrador', 'coordinador'), egresadosCtrl.actualizar);
router.delete('/egresados/:id', authenticate, authorize('administrador', 'coordinador'), egresadosCtrl.eliminar);

// Secciones por egresado: grupos, posgrados, bienestar, seguimiento-grado
// y reconocimientos. El dominio se valida contra una lista blanca.
router.get('/egresados/:id/:dominio', authenticate, egresadoRegCtrl.listarRegistros);
router.post('/egresados/:id/:dominio', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.crearRegistro);
router.put('/egresados/:id/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.actualizarRegistro);
router.delete('/egresados/:id/:dominio/:registroId', authenticate, authorize('administrador', 'coordinador'), egresadoRegCtrl.eliminarRegistro);

module.exports = router;
