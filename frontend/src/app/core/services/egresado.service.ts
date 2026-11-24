import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============================================================
// Interfaces del módulo Egresados (Factor 4)
// ============================================================

export interface Egresado {
  id: string;
  nombre_completo: string;
  cedula: string;
  titulacion?: string;
  anio_graduacion?: number | null;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  conteos?: EgresadoConteos;

  // Solo en el listado
  total_grupos?: number;
  total_posgrados?: number;
  total_bienestar?: number;
  total_seguimiento?: number;
  total_reconocimientos?: number;
}

export interface EgresadoConteos {
  grupos: number;
  posgrados: number;
  bienestar: number;
  seguimiento_grado: number;
  reconocimientos: number;
}

export interface EgresadoFiltros {
  anio?: number;
  busqueda?: string;
  page?: number;
  limit?: number;
}

/** Campos que edita el formulario de alta/edición del egresado. */
export interface FormEgresado {
  nombre_completo: string;
  cedula: string;
  titulacion: string;
  anio_graduacion: number | null;
  telefono: string;
  correo: string;
  observaciones: string;
}

/** Dominios que cuelgan de un egresado (ficha con pestañas). */
export type DominioEgresado =
  | 'grupos' | 'posgrados' | 'bienestar' | 'seguimiento-grado' | 'reconocimientos';

/** Catálogos globales del Factor 4 (no dependen de un egresado). */
export type CatalogoEgresado = 'politicas' | 'formacion-continua';

export type ClaveEsquema = DominioEgresado | CatalogoEgresado;

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'anio' | 'fecha' | 'select';

/** Definición de un campo de formulario, provista por el backend. */
export interface EsquemaCampo {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio?: boolean;
  ancho?: 'medio' | 'completo';
  opciones?: string;
  valorPorDefecto?: string | number;
}

export interface EsquemaEgresado {
  titulo: string;
  etiqueta: string;
  descripcion: string;
  catalogo?: boolean;
  campos: EsquemaCampo[];
}

export type Esquemas = Record<ClaveEsquema, EsquemaEgresado>;

export interface OpcionesEgresado {
  SI_NO: string[];
  ESTADOS_VINCULACION: string[];
  SERVICIOS_BIENESTAR: string[];
  ANIOS: number[];
  TITULACIONES: string[];
}

export interface EstadisticasEgresado {
  filtros: { anio: number | null; titulacion: string | null };
  totales: {
    total: number;
    con_grupo: number;
    con_posgrado: number;
    con_bienestar: number;
    con_seguimiento: number;
    con_reconocimiento: number;
  };
  porAnio: { anio: number; total: number }[];
  porTitulacion: { etiqueta: string; total: number }[];
  grupos: {
    vinculados: number;
    no_vinculados: number;
    total: number;
    porEstado: BarraEgresado[];
    top: BarraEgresado[];
  };
  posgrados: {
    vinculados: number;
    no_vinculados: number;
    total: number;
    porEstado: BarraEgresado[];
    top: BarraEgresado[];
  };
  bienestar: { total: number; porServicio: { etiqueta: string; total: number; egresados: number }[] };
  seguimiento: { total: number; porTiempo: { etiqueta: string; total: number }[] };
  reconocimientos: {
    total: number;
    porTipo: { etiqueta: string; total: number }[];
    porAnio: { anio: number; total: number }[];
  };
}

export interface EstadisticasEgresadoFiltros {
  anio?: number;
  titulacion?: string;
}

export interface BarraEgresado {
  etiqueta: string;
  total: number;
}

/** Fila genérica devuelta por cualquier dominio o catálogo. */
export interface RegistroEgresado {
  id: string;
  egresado_id?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;

  // grupos / posgrados
  vinculado?: string;
  nombre_grupo?: string;
  nombre_posgrado?: string;
  anio?: number;
  estado?: string;

  // bienestar
  servicio?: string;

  // seguimiento de grado
  fecha_egreso?: string;
  tiempo_transcurrido?: string;

  // reconocimientos
  tipo_reconocimiento?: string;
  anio_entrega?: number;
  nombre_reconocimiento?: string;

  // políticas
  nombre?: string;
  objeto?: string;
  link?: string;

  // formación continua
  nombre_programa?: string;
  tipo_programa?: string;
  fecha?: string;
  participante_identificacion?: string;
  participante_nombre?: string;

  [campo: string]: any;
}

@Injectable({ providedIn: 'root' })
export class EgresadoService {
  private readonly API = `${environment.apiUrl}/egresados`;

  private esquemasCache: Esquemas | null = null;

  constructor(private http: HttpClient) {}

  // ── Egresados ───────────────────────────────────────────────

  listar(filtros: EgresadoFiltros = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<{ data: Egresado[]; total: number; totalPaginas: number }>(this.API, { params });
  }

  obtener(id: string) {
    return this.http.get<Egresado>(`${this.API}/${id}`);
  }

  crear(data: Partial<Egresado>) {
    return this.http.post<{ id: string }>(this.API, data);
  }

  actualizar(id: string, data: Partial<Egresado>) {
    return this.http.put(`${this.API}/${id}`, data);
  }

  eliminar(id: string) {
    return this.http.delete(`${this.API}/${id}`);
  }

  // ── Catálogos y esquemas ────────────────────────────────────

  opciones() {
    return this.http.get<OpcionesEgresado>(`${this.API}/opciones`);
  }

  /** Indicadores agregados del Factor 4 sobre los registros reales. */
  estadisticas(filtros: EstadisticasEgresadoFiltros = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<EstadisticasEgresado>(`${this.API}/estadisticas`, { params });
  }

  /** Definición de campos de dominios y catálogos, provista por el backend. */
  esquemas(): Observable<Esquemas | null> {
    if (this.esquemasCache) return of(this.esquemasCache);
    return this.http.get<Esquemas | null>(`${this.API}/esquemas`).pipe(
      map(e => {
        this.esquemasCache = e;
        return e;
      })
    );
  }

  /** Carga en una sola llamada los esquemas y los catálogos. */
  configuracion() {
    return forkJoin({
      esquemas: this.esquemas(),
      opciones: this.opciones(),
    });
  }

  // ── Registros por egresado ──────────────────────────────────

  listarRegistros(id: string, dominio: DominioEgresado) {
    return this.http.get<{ data: RegistroEgresado[]; total: number }>(`${this.API}/${id}/${dominio}`);
  }

  crearRegistro(id: string, dominio: DominioEgresado, data: Record<string, any>) {
    return this.http.post<{ id: string }>(`${this.API}/${id}/${dominio}`, data);
  }

  actualizarRegistro(id: string, dominio: DominioEgresado, registroId: string, data: Record<string, any>) {
    return this.http.put(`${this.API}/${id}/${dominio}/${registroId}`, data);
  }

  eliminarRegistro(id: string, dominio: DominioEgresado, registroId: string) {
    return this.http.delete(`${this.API}/${id}/${dominio}/${registroId}`);
  }

  // ── Catálogos globales ──────────────────────────────────────

  listarCatalogo(dominio: CatalogoEgresado) {
    return this.http.get<{ data: RegistroEgresado[]; total: number }>(`${this.API}/catalogo/${dominio}`);
  }

  crearCatalogo(dominio: CatalogoEgresado, data: Record<string, any>) {
    return this.http.post<{ id: string }>(`${this.API}/catalogo/${dominio}`, data);
  }

  actualizarCatalogo(dominio: CatalogoEgresado, registroId: string, data: Record<string, any>) {
    return this.http.put(`${this.API}/catalogo/${dominio}/${registroId}`, data);
  }

  eliminarCatalogo(dominio: CatalogoEgresado, registroId: string) {
    return this.http.delete(`${this.API}/catalogo/${dominio}/${registroId}`);
  }
}
