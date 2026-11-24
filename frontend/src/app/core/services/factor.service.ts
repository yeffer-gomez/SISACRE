import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Factor {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  total_caracteristicas?: number;
  total_documentos?: number;
}

export interface Caracteristica {
  id: number;
  factor_id: number;
  codigo: string;
  nombre: string;
}

export interface TipoEvidencia {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class FactorService {
  readonly API = environment.apiUrl;

  constructor(readonly http: HttpClient) {}

  listar() {
    return this.http.get<Factor[]>(`${this.API}/factores`);
  }

  obtener(id: number) {
    return this.http.get<Factor>(`${this.API}/factores/${id}`);
  }

  crear(data: Partial<Factor>) {
    return this.http.post<Factor>(`${this.API}/factores`, data);
  }

  actualizar(id: number, data: Partial<Factor>) {
    return this.http.put<Factor>(`${this.API}/factores/${id}`, data);
  }

  listarCaracteristicas(factorId: number) {
    return this.http.get<Caracteristica[]>(`${this.API}/factores/${factorId}/caracteristicas`);
  }

  crearCaracteristica(factorId: number, data: Partial<Caracteristica>) {
    return this.http.post<Caracteristica>(`${this.API}/factores/${factorId}/caracteristicas`, data);
  }

  listarTiposEvidencia() {
    return this.http.get<TipoEvidencia[]>(`${this.API}/tipos-evidencia`);
  }
}
