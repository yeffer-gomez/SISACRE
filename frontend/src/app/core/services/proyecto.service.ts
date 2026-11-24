import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Proyecto {
  id: string;
  nombre: string;
  anio_publicacion: number;
  semestre?: string;
  duracion?: string;
  tipo_producto?: string;
  objetivo?: string;
  resumen?: string;
  resultado_proyecto?: string;
  fecha_inicio?: string;
  tipo_proyecto?: string;
  objeto_socioeconomico?: string;
  link_iisn?: string;
  financiado_viis?: string;
  codigo_proyecto?: string;
  registrado_por_nombre?: string;
  created_at: string;
}

export interface ProyectoFiltros {
  anio?: number;
  semestre?: string;
  tipo_proyecto?: string;
  tipo_producto?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface OpcionesProyecto {
  TIPOS_PRODUCTO: string[];
  TIPOS_PROYECTO: string[];
  OBJETOS_SOCIOECONOMICOS: string[];
}

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private readonly API = `${environment.apiUrl}/proyectos`;

  constructor(private http: HttpClient) {}

  listar(filtros: ProyectoFiltros = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<{ data: Proyecto[]; total: number; totalPaginas: number }>(this.API, { params });
  }

  obtener(id: string) {
    return this.http.get<Proyecto>(`${this.API}/${id}`);
  }

  crear(data: Partial<Proyecto>) {
    return this.http.post<{ id: string }>(this.API, data);
  }

  actualizar(id: string, data: Partial<Proyecto>) {
    return this.http.put(`${this.API}/${id}`, data);
  }

  eliminar(id: string) {
    return this.http.delete(`${this.API}/${id}`);
  }

  opciones() {
    return this.http.get<OpcionesProyecto>(`${this.API}/opciones`);
  }

  estadisticas() {
    return this.http.get<any>(`${this.API}/estadisticas`);
  }
}
