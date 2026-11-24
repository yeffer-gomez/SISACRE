import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EstadisticasEgresado, EstadisticasEgresadoFiltros, EgresadoService, OpcionesEgresado, BarraEgresado
} from '../../../core/services/egresado.service';

@Component({
  selector: 'app-egresado-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="breadcrumbs"><a routerLink="/egresados">Egresados</a><span>/</span><span>Estadísticas</span></nav>

    <header class="page-head">
      <div>
        <h1>Estadísticas de egresados</h1>
        <p class="text-muted">Indicadores del Factor 4 calculados sobre los registros reales de la base de datos.</p>
      </div>
      <a routerLink="/egresados" class="btn btn-ghost">Volver al listado</a>
    </header>

    <div class="filtros">
      <input type="number" class="form-control anio" placeholder="Año de graduación"
             [(ngModel)]="filtros.anio" name="anio" (change)="cargar()" />
      <select class="form-control" [(ngModel)]="filtros.titulacion" name="titulacion" (change)="cargar()">
        <option value="">Toda titulación</option>
        @for (t of opciones()?.TITULACIONES ?? []; track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <button class="btn btn-ghost" (click)="limpiar()">Limpiar</button>
    </div>

    @if (cargando()) {
      <div class="loading-overlay" style="min-height:300px"><div class="spinner spinner-dark"></div></div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else {
      @if (stats(); as s) {
      <div class="tarjetas">
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.total }}</span>
          <span class="tarjeta-label">Egresados</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.con_grupo }}</span>
          <span class="tarjeta-label">En grupos de invest.</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.con_posgrado }}</span>
          <span class="tarjeta-label">En posgrados</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.con_bienestar }}</span>
          <span class="tarjeta-label">Con bienestar</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.con_reconocimiento }}</span>
          <span class="tarjeta-label">Con reconocimientos</span>
        </div>
      </div>

      <div class="columnas">
        <section class="card">
          <h2>Egresados por año de graduación</h2>
          @if (s.porAnio.length === 0) {
            <p class="text-muted">Ningún egresado tiene año de graduación registrado.</p>
          } @else {
            <div class="grafico">
              @for (e of s.porAnio; track e.anio) {
                <div class="columna">
                  <div class="barra-columna" [style.height.%]="porcentaje(e.total, maxAnio(s))">
                    <span class="barra-total">{{ e.total }}</span>
                  </div>
                  <span class="eje">{{ e.anio }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2>Titulación</h2>
          @if (s.porTitulacion.length === 0) {
            <p class="text-muted">Sin titulaciones registradas.</p>
          } @else {
            <div class="barras">
              @for (b of s.porTitulacion; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, s.totales.total)"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>

      <div class="columnas">
        <section class="card">
          <h2>Vinculación a grupos de investigación</h2>
          <div class="cifras">
            <div class="cifra"><strong>{{ s.grupos.vinculados }}</strong><span>Vinculados</span></div>
            <div class="cifra"><strong>{{ s.grupos.total }}</strong><span>Registros</span></div>
          </div>
          @if (s.grupos.porEstado.length > 0) {
            <h3 class="sub-titulo">Estado</h3>
            <div class="barras">
              @for (b of s.grupos.porEstado; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.grupos.porEstado))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
          @if (s.grupos.top.length > 0) {
            <h3 class="sub-titulo">Grupos con más egresados</h3>
            <div class="barras">
              @for (b of s.grupos.top; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.grupos.top))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2>Vinculación a posgrados</h2>
          <div class="cifras">
            <div class="cifra"><strong>{{ s.posgrados.vinculados }}</strong><span>Vinculados</span></div>
            <div class="cifra"><strong>{{ s.posgrados.total }}</strong><span>Registros</span></div>
          </div>
          @if (s.posgrados.porEstado.length > 0) {
            <h3 class="sub-titulo">Estado</h3>
            <div class="barras">
              @for (b of s.posgrados.porEstado; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.posgrados.porEstado))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
          @if (s.posgrados.top.length > 0) {
            <h3 class="sub-titulo">Posgrados con más egresados</h3>
            <div class="barras">
              @for (b of s.posgrados.top; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.posgrados.top))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>

      <section class="card">
        <h2>Servicios de bienestar utilizados</h2>
        @if (s.bienestar.porServicio.length === 0) {
          <p class="text-muted">Ningún egresado tiene servicios de bienestar registrados.</p>
        } @else {
          <div class="barras">
            @for (b of s.bienestar.porServicio; track b.etiqueta) {
              <div class="barra-fila">
                <span class="barra-label">{{ b.etiqueta }}</span>
                <div class="barra-track">
                  <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxServicio(s))"></div>
                </div>
                <span class="barra-valor">{{ b.total }} <small>({{ b.egresados }} egresados)</small></span>
              </div>
            }
          </div>
        }
      </section>

      <div class="columnas">
        <section class="card">
          <h2>Seguimiento al proceso de grado</h2>
          @if (s.seguimiento.porTiempo.length === 0) {
            <p class="text-muted">Sin registros de seguimiento.</p>
          } @else {
            <div class="barras">
              @for (b of s.seguimiento.porTiempo; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.seguimiento.porTiempo))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2>Reconocimientos por tipo</h2>
          @if (s.reconocimientos.porTipo.length === 0) {
            <p class="text-muted">Sin reconocimientos registrados.</p>
          } @else {
            <div class="barras">
              @for (b of s.reconocimientos.porTipo; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxBarra(s.reconocimientos.porTipo))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>
      }
    }
  `,
  styles: [`
    .breadcrumbs { display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;
      a { color: var(--primary); font-weight: 600; } }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
      h1 { font-size: 1.6rem; margin-bottom: 4px; } p { font-size: 0.95rem; max-width: 72ch; } }

    .filtros {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px;
      .form-control { width: auto; min-width: 180px; }
      .anio { min-width: 170px; max-width: 200px; }
    }

    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .tarjeta {
      background: var(--surface-card); border: 1px solid var(--border-light); border-radius: var(--radius);
      padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 2px;
    }
    .tarjeta-valor { font-size: 2rem; font-weight: 700; color: var(--primary); line-height: 1.1; }
    .tarjeta-label { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }

    .columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 16px; }

    .card {
      background: var(--surface-card); border: 1px solid var(--border-light); border-radius: var(--radius);
      padding: 20px; margin-bottom: 16px;
      h2 { font-size: 1.05rem; margin-bottom: 16px; } h3.sub-titulo { font-size: 0.9rem; margin: 18px 0 12px; color: var(--text-secondary); }
    }

    .barras { display: flex; flex-direction: column; gap: 12px; }
    .barra-fila { display: grid; grid-template-columns: 180px 1fr 130px; align-items: center; gap: 12px; }
    .barra-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); word-break: break-word; }
    .barra-track { height: 10px; background: var(--border-light); border-radius: 100px; overflow: hidden; }
    .barra-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%); transition: width 0.4s ease; }
    .barra-valor { font-size: 0.88rem; font-weight: 600; text-align: right; }
    .barra-valor small { font-weight: 500; color: var(--text-muted); }

    .cifras { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .cifra { text-align: center; padding: 14px; background: var(--surface-page); border-radius: var(--radius-sm);
      strong { display: block; font-size: 1.5rem; color: var(--primary); line-height: 1.1; }
      span { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; } }

    .grafico { display: flex; align-items: flex-end; gap: 10px; height: 200px; padding-top: 24px; overflow-x: auto; }
    .columna { flex: 1; min-width: 34px; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .barra-columna {
      width: 100%; max-width: 48px; background: linear-gradient(180deg, var(--primary-light) 0%, var(--primary) 100%);
      border-radius: 6px 6px 0 0; position: relative; min-height: 4px; transition: height 0.4s ease;
    }
    .barra-total { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
    .eje { font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-weight: 600; }

    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 28px; height: 28px; }
    @media (max-width: 640px) { .barra-fila { grid-template-columns: 120px 1fr 100px; } }
  `]
})
export class EgresadoDashboardComponent implements OnInit {
  stats = signal<EstadisticasEgresado | null>(null);
  opciones = signal<OpcionesEgresado | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  filtros: EstadisticasEgresadoFiltros = {};

  constructor(private egresadoService: EgresadoService) {}

  ngOnInit() {
    this.egresadoService.opciones().subscribe({
      next: o => this.opciones.set(o),
      error: () => {}
    });
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.egresadoService.estadisticas(this.filtros).subscribe({
      next: s => {
        this.stats.set(s);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'No se pudieron cargar las estadísticas');
        this.cargando.set(false);
      }
    });
  }

  limpiar() {
    this.filtros = {};
    this.cargar();
  }

  porcentaje(valor: number, total: number): number {
    return total > 0 ? (valor / total) * 100 : 0;
  }

  maxBarra(filas: BarraEgresado[]): number {
    return Math.max(...filas.map(f => f.total), 1);
  }

  maxAnio(s: EstadisticasEgresado): number {
    return Math.max(...s.porAnio.map(e => e.total), 1);
  }

  maxServicio(s: EstadisticasEgresado): number {
    return Math.max(...s.bienestar.porServicio.map(b => b.total), 1);
  }
}
