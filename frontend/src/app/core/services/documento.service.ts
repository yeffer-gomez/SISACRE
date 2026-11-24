import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Documento {
  id: string;
  titulo: string;
  descripcion?: string;
  factor_id?: number;
  factor_codigo?: string;
  factor_nombre?: string;
  caracteristica_id?: number;
  caracteristica_codigo?: string;
  caracteristica_nombre?: string;
  tipo_evidencia_id?: number;
  tipo_evidencia?: string;
  anio: number;
  semestre?: string;
  responsable?: string;
  subido_por_nombre?: string;
  nombre_original?: string;
  tipo_mime?: string;
  tamanio_bytes?: number;
  created_at: string;
  versiones?: any[];
}

export interface DocumentoFiltros {
  factor_id?: number;
  caracteristica_id?: number;
  tipo_evidencia_id?: number;
  anio?: number;
  semestre?: string;
  responsable?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly API = `${environment.apiUrl}/documentos`;

  constructor(private http: HttpClient) {}

  listar(filtros: DocumentoFiltros = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<{ data: Documento[]; total: number; totalPaginas: number }>(this.API, { params });
  }

  obtener(id: string) {
    return this.http.get<Documento>(`${this.API}/${id}`);
  }

  crear(formData: FormData) {
    return this.http.post<{ id: string }>(this.API, formData);
  }

  actualizar(id: string, datos: Partial<Documento>) {
    return this.http.put(`${this.API}/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.delete(`${this.API}/${id}`);
  }

  nuevaVersion(id: string, formData: FormData) {
    return this.http.post(`${this.API}/${id}/versiones`, formData);
  }

  getUrlDescarga(id: string, versionId?: string): string {
    const base = `${this.API}/${id}/descargar`;
    return versionId ? `${base}?version_id=${versionId}` : base;
  }

  getUrlVisualizacion(id: string): string {
    return `${this.API}/${id}/visualizar`;
  }

  descargar(id: string, nombreArchivo: string) {
    return this.http.get(`${this.API}/${id}/descargar`, { responseType: 'blob' });
  }

  estadisticas() {
    return this.http.get<any>(`${this.API}/estadisticas`);
  }
}
