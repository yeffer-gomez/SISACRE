import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstadisticasDocente, DocenteService, OpcionesDocente } from '../../../core/services/docente.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-docente-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="breadcrumbs"><a routerLink="/docentes">Docentes</a><span>/</span><span>Estadísticas</span></nav>

    <header class="page-head">
      <div>
        <h1>Estadísticas de la planta docente</h1>
        <p class="text-muted">Indicadores del Factor 3 calculados sobre los registros reales de la base de datos.</p>
      </div>
      <a routerLink="/docentes" class="btn btn-ghost">Volver al listado</a>
    </header>

    <div class="filtros">
      <input type="number" class="form-control anio" placeholder="Año" [(ngModel)]="filtros.anio" name="anio" (change)="cargar()" />
      <select class="form-control" [(ngModel)]="filtros.periodo" name="periodo" (change)="cargar()">
        <option value="">Todo el año</option>
        @for (p of opciones()?.PERIODOS ?? []; track p) { <option [value]="p">{{ p }}</option> }
      </select>
      <select class="form-control" [(ngModel)]="filtros.tipo_vinculacion" name="tipo_vinculacion" (change)="cargar()">
        <option value="">Toda vinculación</option>
        @for (t of opciones()?.TIPOS_VINCULACION ?? []; track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <select class="form-control" [(ngModel)]="filtros.area_enfoque" name="area_enfoque" (change)="cargar()">
        <option value="">Toda área</option>
        @for (a of opciones()?.AREAS ?? []; track a) { <option [value]="a">{{ a }}</option> }
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
          <span class="tarjeta-label">Docentes</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.tiempo_completo }}</span>
          <span class="tarjeta-label">Tiempo completo</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.hora_catedra }}</span>
          <span class="tarjeta-label">Hora cátedra</span>
        </div>
        <div class="tarjeta">
          <span class="tarjeta-valor">{{ s.totales.medio_tiempo }}</span>
          <span class="tarjeta-label">Medio tiempo</span>
        </div>
        <div class="tarjeta" [class.alerta]="s.totales.sin_vinculacion > 0">
          <span class="tarjeta-valor">{{ s.totales.sin_vinculacion }}</span>
          <span class="tarjeta-label">Sin vinculación</span>
        </div>
      </div>

      <div class="columnas">
        <section class="card">
          <h2>Distribución por tipo de vinculación</h2>
          @if (s.porTipoVinculacion.length === 0) {
            <p class="text-muted">Sin datos de vinculación.</p>
          } @else {
            <div class="barras">
              @for (b of s.porTipoVinculacion; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, s.totales.total)"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }} <small>({{ porcentaje(b.total, s.totales.total) | number:'1.0-0' }}%)</small></span>
                </div>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2>Escalafón</h2>
          <div class="cifras">
            <div class="cifra">
              <strong>{{ s.totales.con_escalafon }}</strong>
              <span>Con escalafón registrado</span>
            </div>
            <div class="cifra">
              <strong>{{ s.totales.con_categoria_investigador }}</strong>
              <span>Con categoría de investigador</span>
            </div>
          </div>
          @if (s.porNivelFormacion.length > 0) {
            <h3 class="sub-titulo">Nivel de formación</h3>
            <div class="barras">
              @for (b of s.porNivelFormacion; track b.etiqueta) {
                <div class="barra-fila">
                  <span class="barra-label">{{ b.etiqueta }}</span>
                  <div class="barra-track">
                    <div class="barra-fill" [style.width.%]="porcentaje(b.total, maxFormacion(s))"></div>
                  </div>
                  <span class="barra-valor">{{ b.total }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>

      @if (s.evolucion.length > 1) {
        <section class="card">
          <h2>Evolución de la vinculación por año</h2>
          <div class="grafico">
            @for (e of s.evolucion; track e.anio) {
              <div class="columna">
                <div class="barra-columna" [style.height.%]="porcentaje(e.total, maxEvolucion(s))">
                  <span class="barra-total">{{ e.total }}</span>
                </div>
                <span class="eje">{{ e.anio }}</span>
              </div>
            }
          </div>
        </section>
      }

      <section class="card">
        <h2>Redes académicas</h2>
        <div class="cifras">
          <div class="cifra"><strong>{{ s.redes.docentes_participantes }}</strong><span>Docentes en redes</span></div>
          <div class="cifra"><strong>{{ s.redes.redes }}</strong><span>Redes</span></div>
          <div class="cifra"><strong>{{ s.redes.participaciones }}</strong><span>Participaciones</span></div>
        </div>
      </section>

      <section class="card">
        <h2>Áreas de enfoque</h2>
        @if (s.porArea.length === 0) {
          <p class="text-muted">Ningún docente tiene área registrada.</p>
        } @else {
          <div class="areas">
            @for (a of s.porArea; track a.etiqueta) {
              <div class="area-chip">
                {{ a.etiqueta }}
                <span class="area-total">{{ a.total }}</span>
              </div>
            }
          </div>
        }
      </section>
      }
    }
  `,
  styles: [`
    .breadcrumbs { display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;
      a { color: var(--primary); font-weight: 600; } }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
      h1 { font-size: 1.6rem; margin-bottom: 4px; } p { font-size: 0.95rem; max-width: 72ch; } }

    .filtros { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px;
      .form-control { width: auto; min-width: 150px; } .anio { min-width: 110px; } }

    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .tarjeta {
      background: var(--surface-card); border: 1px solid var(--border-light); border-radius: var(--radius);
      padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 4px;
    }
    .tarjeta.alerta { border-color: var(--warning); background: rgba(217,119,6,0.06); }
    .tarjeta.alerta .tarjeta-valor { color: var(--warning); }
    .tarjeta-valor { font-size: 2rem; font-weight: 700; color: var(--primary); line-height: 1.1; }
    .tarjeta-label { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }

    .columnas { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 16px; }

    .card {
      background: var(--surface-card); border: 1px solid var(--border-light); border-radius: var(--radius);
      padding: 20px; margin-bottom: 16px;
      h2 { font-size: 1.05rem; margin-bottom: 16px; } h3.sub-titulo { font-size: 0.9rem; margin: 18px 0 12px; color: var(--text-secondary); }
    }

    .barras { display: flex; flex-direction: column; gap: 12px; }
    .barra-fila { display: grid; grid-template-columns: 140px 1fr 90px; align-items: center; gap: 12px; }
    .barra-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
    .barra-track { height: 10px; background: var(--border-light); border-radius: 100px; overflow: hidden; }
    .barra-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%); transition: width 0.4s ease; }
    .barra-valor { font-size: 0.88rem; font-weight: 600; text-align: right; }
    .barra-valor small { font-weight: 500; color: var(--text-muted); }

    .cifras { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .cifra { text-align: center; padding: 14px; background: var(--surface-page); border-radius: var(--radius-sm);
      strong { display: block; font-size: 1.5rem; color: var(--primary); line-height: 1.1; }
      span { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; } }

    .grafico { display: flex; align-items: flex-end; gap: 10px; height: 200px; padding-top: 20px; }
    .columna { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .barra-columna {
      width: 100%; max-width: 48px; background: linear-gradient(180deg, var(--primary-light) 0%, var(--primary) 100%);
      border-radius: 6px 6px 0 0; position: relative; min-height: 4px; transition: height 0.4s ease;
    }
    .barra-total { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
    .eje { font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-weight: 600; }

    .areas { display: flex; gap: 8px; flex-wrap: wrap; }
    .area-chip {
      display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 100px;
      background: var(--surface-page); border: 1px solid var(--border-light);
      font-size: 0.85rem; font-weight: 600;
    }
    .area-total { background: var(--primary); color: #fff; border-radius: 100px; padding: 1px 8px; font-size: 0.75rem; }

    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 28px; height: 28px; }
    @media (max-width: 640px) { .barra-fila { grid-template-columns: 110px 1fr 70px; } }
  `]
})
export class DocenteDashboardComponent implements OnInit {
  stats = signal<EstadisticasDocente | null>(null);
  opciones = signal<OpcionesDocente | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  filtros: { anio?: number; periodo?: string; tipo_vinculacion?: string; area_enfoque?: string } = {};

  constructor(private docenteService: DocenteService, private auth: AuthService) {}

  ngOnInit() {
    this.docenteService.opciones().subscribe({
      next: o => this.opciones.set(o),
      error: () => {}
    });
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.docenteService.estadisticas(this.filtros).subscribe({
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

  maxFormacion(s: EstadisticasDocente): number {
    return Math.max(...s.porNivelFormacion.map(f => f.total), 1);
  }

  maxEvolucion(s: EstadisticasDocente): number {
    return Math.max(...s.evolucion.map(e => e.total), 1);
  }
}
