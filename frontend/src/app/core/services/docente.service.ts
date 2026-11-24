import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============================================================
// Interfaces del módulo Docentes (Factor 3)
// ============================================================

export interface Docente {
  id: string;
  numero_docente: string;
  nombre_completo: string;
  documento?: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  area_enfoque?: string;
  estado: string;
  usuario_id?: string;
  observaciones?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;

  // Valores vigentes resueltos por el backend sobre el registro
  // histórico más reciente (no son columnas de `docentes`).
  tipo_vinculacion?: string;
  dedicacion?: string;
  anio_vinculacion?: number;
  fecha_vinculacion?: string;
  tiempo_vinculacion?: string;
  horas_semanales?: number;
  acto_vinculacion?: string;
  acuerdo_hora_catedra?: string;
  nivel_escalafon?: string;
  categoria_escalafon?: string;
  categoria_investigador?: string;

  usuario_nombre?: string;
  usuario_correo?: string;
  conteos?: DocentConteos;

  // Solo en el listado
  total_vinculaciones?: number;
  total_formaciones?: number;
  total_evaluaciones?: number;
}

export interface DocentConteos {
  vinculaciones: number;
  formaciones: number;
  escalafones: number;
  evaluaciones: number;
  mejoramientos: number;
  redes: number;
  redes_distintas: number;
}

export interface DocenteFiltros {
  estado?: string;
  tipo_vinculacion?: string;
  area_enfoque?: string;
  anio?: number;
  nivel_escalafon?: string;
  categoria_escalafon?: string;
  cargo?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

/** Campos que edita el formulario de alta/edición del docente. */
export interface FormDocente {
  nombre_completo: string;
  documento: string;
  correo: string;
  telefono: string;
  cargo: string;
  area_enfoque: string;
  estado: string;
  observaciones: string;
}

export interface VinculacionInicial {
  anio_vinculacion?: number;
  fecha_vinculacion?: string;
  tipo_vinculacion?: string;
  dedicacion?: string;
  tiempo_vinculacion?: string;
  horas_semanales?: number;
  acto_vinculacion?: string;
  observaciones?: string;
}

export type DominioDocente =
  | 'vinculaciones'
  | 'formaciones'
  | 'escalafones'
  | 'evaluaciones'
  | 'mejoramientos'
  | 'redes';

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'anio' | 'horas' | 'fecha' | 'select';

/** Definición de un campo de formulario, provista por el backend. */
export interface EsquemaCampo {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio?: boolean;
  ancho?: 'medio' | 'completo';
  opciones?: string;
  opcionesEndpoint?: string;
  opcionesEtiqueta?: string;
  opcionesFiltro?: Record<string, string | number>;
  valorPorDefecto?: string | number;
}

export interface EsquemaDominio {
  titulo: string;
  etiqueta: string;
  descripcion: string;
  campos: EsquemaCampo[];
}

export type Esquemas = Record<DominioDocente, EsquemaDominio>;

export interface OpcionesDocente {
  TIPOS_VINCULACION: string[];
  ESTADOS: string[];
  DEDICACIONES: string[];
  TIEMPOS_VINCULACION: string[];
  NIVELES_ESCALAFON: string[];
  CATEGORIAS_ESCALAFON: string[];
  NIVELES_FORMACION: string[];
  PERIODOS: string[];
  EVALUADORES: string[];
  ESCALAS: string[];
  ESTADOS_MEJORAMIENTO: string[];
  TIPOS_ALCANCE_RED: string[];
  TIPOS_PARTICIPACION_RED: string[];
  AREAS: string[];
  NIVELES: string[];
  CATEGORIAS: string[];
  ANIOS: number[];
}

/**
 * Fila de cualquiera de los seis dominios. Los campos frecuentes se
 * declaran explícitamente porque el proyecto usa
 * `noPropertyAccessFromIndexSignature`: con la firma de índice sola,
 * `r.anio` no compila y obligaría a escribir `r['anio']` en todas partes.
 * La firma sigue abierta para los campos derivados que agrega el backend
 * (nombre de red, título de evidencia, etc.).
 */
export interface RegistroDocente {
  id: string;
  docente_id?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
  observaciones?: string;
  documento_id?: string | null;
  evidencia_id?: string | null;
  evidencia_titulo?: string | null;

  // vinculaciones
  anio_vinculacion?: number;
  fecha_vinculacion?: string;
  tipo_vinculacion?: string;
  dedicacion?: string;
  tiempo_vinculacion?: string;
  horas_semanales?: number;
  acto_vinculacion?: string;

  // formaciones
  nivel_formacion?: string;
  titulo?: string;
  programa?: string;
  institucion?: string;
  anio_graduacion?: number;

  // escalafones
  nivel?: string;
  categoria?: string;
  fecha?: string;
  decreto_1279?: string;
  acto_ascenso?: string;
  categoria_investigador?: string;

  // evaluaciones
  anio?: number;
  periodo?: string;
  tipo_evaluacion?: string;
  evaluador?: string;
  escala?: string;
  resultado?: number;

  // planes de mejoramiento
  plan?: string;
  hallazgo?: string;
  accion?: string;
  estado?: string;
  responsable?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  seguimiento?: string;

  // redes
  red_id?: string | null;
  red_nombre?: string | null;
  tipo_alcance?: string;
  tipo_participacion?: string;
  enlace_referencia?: string;
  sitio_web?: string;

  [campo: string]: any;
}

export interface EventoHistorico {
  categoria: string;
  anio: number | null;
  fecha: string;
  titulo: string;
  detalle: string | null;
  registro_id: string;
  observaciones: string | null;
  /** False cuando el registro fue eliminado lógicamente: se conserva para auditoría. */
  activo: boolean;
}

export interface EvidenciaDocente {
  id: string;
  titulo: string;
  anio: number;
  semestre?: string;
  tipo_mime?: string;
  created_at: string;
  factor_codigo?: string;
  factor_nombre?: string;
  caracteristica_codigo?: string;
  tipo_evidencia?: string;
  origen: string;
  origen_etiqueta: string;
  registro_id: string | null;
  nombre_original?: string;
  tamanio_bytes?: number;
}

export interface RedAcademica {
  id: string;
  nombre: string;
  tipo_alcance: string;
  descripcion?: string;
  sitio_web?: string;
  total_docentes?: number;
}

export interface EstadisticasDocente {
  filtros: { anio: number | null; periodo: string | null; tipo_vinculacion: string | null; area_enfoque: string | null };
  totales: {
    total: number;
    tiempo_completo: number;
    hora_catedra: number;
    medio_tiempo: number;
    sin_vinculacion: number;
    con_escalafon: number;
    con_categoria_investigador: number;
  };
  porTipoVinculacion: { etiqueta: string; total: number }[];
  porArea: { etiqueta: string; total: number }[];
  porDedicacion: { etiqueta: string; total: number }[];
  evolucion: { anio: number; total: number; tiempo_completo: number; hora_catedra: number }[];
  porNivelFormacion: { etiqueta: string; total: number }[];
  porAnioEvaluacion: { anio: number; promedio: number | null; total: number }[];
  porTipoEvaluacion: { etiqueta: string; promedio: number | null; total: number }[];
  resultadosEvaluacion: { etiqueta: string; promedio: number | null; total: number }[];
  redes: { docentes_participantes: number; redes: number; participaciones: number };
  mejoramientos: { etiqueta: string; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class DocenteService {
  private readonly API = `${environment.apiUrl}/docentes`;
  private readonly REDES_API = `${environment.apiUrl}/redes-academicas`;

  private esquemasCache: Esquemas | null = null;

  constructor(private http: HttpClient) {}

  // ── Docentes ────────────────────────────────────────────────

  listar(filtros: DocenteFiltros = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<{ data: Docente[]; total: number; totalPaginas: number }>(this.API, { params });
  }

  obtener(id: string) {
    return this.http.get<Docente>(`${this.API}/${id}`);
  }

  crear(data: Partial<Docente> & { vinculacion?: VinculacionInicial }) {
    return this.http.post<{ id: string }>(this.API, data);
  }

  actualizar(id: string, data: Partial<Docente>) {
    return this.http.put(`${this.API}/${id}`, data);
  }

  eliminar(id: string) {
    return this.http.delete(`${this.API}/${id}`);
  }

  historico(id: string) {
    return this.http.get<{ data: EventoHistorico[]; total: number }>(`${this.API}/${id}/historico`);
  }

  // ── Estadísticas e indicadores ──────────────────────────────

  estadisticas(filtros: Partial<DocenteFiltros> & { periodo?: string } = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<EstadisticasDocente>(`${this.API}/estadisticas`, { params });
  }

  /** Vuelca los indicadores calculados en la tabla `indicadores` ya existente. */
  sincronizarIndicadores() {
    return this.http.post<{ message: string; registros: number }>(`${this.API}/indicadores/sincronizar`, {});
  }

  // ── Evidencias ──────────────────────────────────────────────

  listarDocumentos(id: string) {
    return this.http.get<{ data: EvidenciaDocente[]; total: number }>(`${this.API}/${id}/documentos`);
  }

  crearDocumento(id: string, formData: FormData) {
    return this.http.post<{ id: string; enlazada: boolean }>(`${this.API}/${id}/documentos`, formData);
  }

  // ── Catálogos y esquemas ────────────────────────────────────

  opciones() {
    return this.http.get<OpcionesDocente>(`${this.API}/opciones`);
  }

  /**
   * Definición de campos de los 6 dominios, provista por el backend.
   * Se cachea porque es inmutable durante la sesión y se usa en cada
   * pestaña del perfil.
   */
  esquemas(): Observable<Esquemas | null> {
    if (this.esquemasCache) return of(this.esquemasCache);
    return this.http.get<Esquemas | null>(`${this.API}/esquemas`).pipe(
      map(e => {
        this.esquemasCache = e;
        return e;
      })
    );
  }

  /** Opciones de un <select> con fuente dinámica declarada en el esquema. */
  opcionesDinamicas(campo: EsquemaCampo, docenteId: string): Observable<{ id: string; etiqueta: string }[]> {
    if (!campo.opcionesEndpoint) return of([]);
    let url = campo.opcionesEndpoint.replace('{id}', docenteId);
    if (campo.opcionesFiltro) {
      let params = new HttpParams();
      Object.entries(campo.opcionesFiltro).forEach(([k, v]) => (params = params.set(k, String(v))));
      return this.http.get<{ data: any[] }>(url, { params }).pipe(
        map(r => (r.data || []).map(x => ({ id: String(x.id), etiqueta: String(x[campo.opcionesEtiqueta || 'nombre'] ?? '') }))),
        catchError(() => of([] as { id: string; etiqueta: string }[]))
      );
    }
    return this.http.get<{ data: any[] }>(url).pipe(
      map(r => (r.data || []).map(x => ({ id: String(x.id), etiqueta: String(x[campo.opcionesEtiqueta || 'nombre'] ?? '') }))),
      catchError(() => of([] as { id: string; etiqueta: string }[]))
    );
  }

  // ── Redes académicas ────────────────────────────────────────

  listarRedes() {
    return this.http.get<{ data: RedAcademica[] }>(this.REDES_API);
  }

  crearRed(data: Partial<RedAcademica>) {
    return this.http.post<{ id: string }>(this.REDES_API, data);
  }

  actualizarRed(id: string, data: Partial<RedAcademica>) {
    return this.http.put(`${this.REDES_API}/${id}`, data);
  }

  // ── Registros históricos genéricos ──────────────────────────

  listarRegistros(id: string, dominio: DominioDocente) {
    return this.http.get<{ data: RegistroDocente[]; total: number }>(`${this.API}/${id}/${dominio}`);
  }

  crearRegistro(id: string, dominio: DominioDocente, data: Record<string, any>) {
    return this.http.post<{ id: string }>(`${this.API}/${id}/${dominio}`, data);
  }

  actualizarRegistro(id: string, dominio: DominioDocente, registroId: string, data: Record<string, any>) {
    return this.http.put(`${this.API}/${id}/${dominio}/${registroId}`, data);
  }

  eliminarRegistro(id: string, dominio: DominioDocente, registroId: string) {
    return this.http.delete(`${this.API}/${id}/${dominio}/${registroId}`);
  }

  /**
   * Carga en una sola llamada los esquemas y los catálogos.
   * Evita que cada pestaña dispare dos peticiones por separado.
   */
  configuracion() {
    return forkJoin({
      esquemas: this.esquemas(),
      opciones: this.opciones()
    });
  }
}
