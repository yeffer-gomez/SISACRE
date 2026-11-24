import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Docente, DocenteFiltros, DocenteService, OpcionesDocente } from '../../../core/services/docente.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-docente-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>Docentes</h1>
        <p class="text-muted">Planta docente del programa: vinculación, formación, escalafón, evaluación, mejoramiento y redes.</p>
      </div>
      <div class="acciones">
        <a routerLink="/docentes/estadisticas" class="btn btn-ghost">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Estadísticas
        </a>
        @if (puedeCrear()) {
          <a routerLink="/docentes/nuevo" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo docente
          </a>
        }
      </div>
    </header>

    <div class="filtros">
      <div class="buscador">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" class="form-control"
               placeholder="Buscar por nombre, documento o número docente"
               [(ngModel)]="filtros.busqueda" name="busqueda"
               (keyup.enter)="cargar(1)" />
      </div>
      <select class="form-control" [(ngModel)]="filtros.estado" name="estado" (change)="cargar(1)">
        <option value="">Todos los estados</option>
        @for (e of opciones()?.ESTADOS ?? []; track e) { <option [value]="e">{{ e }}</option> }
      </select>
      <select class="form-control" [(ngModel)]="filtros.tipo_vinculacion" name="tipo_vinculacion" (change)="cargar(1)">
        <option value="">Toda vinculación</option>
        @for (v of opciones()?.TIPOS_VINCULACION ?? []; track v) { <option [value]="v">{{ v }}</option> }
      </select>
      <select class="form-control" [(ngModel)]="filtros.nivel_escalafon" name="nivel_escalafon" (change)="cargar(1)">
        <option value="">Todo escalafón</option>
        @for (n of opciones()?.NIVELES_ESCALAFON ?? []; track n) { <option [value]="n">{{ n }}</option> }
      </select>
      <input type="number" class="form-control anio" placeholder="Año vincul." [(ngModel)]="filtros.anio" name="anio"
             (keyup.enter)="cargar(1)" />
      @if (hayFiltros()) {
        <button class="btn btn-ghost" (click)="limpiar()">Limpiar</button>
      }
    </div>

    @if (cargando()) {
      <div class="loading-overlay" style="min-height:280px"><div class="spinner spinner-dark"></div></div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (docentes().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>{{ hayFiltros() ? 'Sin resultados' : 'Aún no hay docentes' }}</h3>
        <p>{{ hayFiltros() ? 'Prueba a quitar algún filtro.' : 'Registra el primer docente para empezar a construir la ficha del Factor 3.' }}</p>
        @if (hayFiltros()) {
          <button class="btn btn-ghost" style="margin-top:16px" (click)="limpiar()">Limpiar filtros</button>
        } @else if (puedeCrear()) {
          <a routerLink="/docentes/nuevo" class="btn btn-primary" style="margin-top:16px">Registrar docente</a>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Área / Enfoque</th>
              <th>Vinculación</th>
              <th>Escalafón</th>
              <th>Registros</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of docentes(); track d.id) {
              <tr>
                <td>
                  <a [routerLink]="['/docentes', d.id]" class="link-docente">
                    <span class="avatar-sm">{{ iniciales(d) }}</span>
                    <span>
                      <strong>{{ d.nombre_completo }}</strong>
                      <span class="sub">{{ d.numero_docente }}@if (d.documento) { · {{ d.documento }} }</span>
                    </span>
                  </a>
                </td>
                <td class="text-sm">{{ d.area_enfoque || '—' }}</td>
                <td>
                  @if (d.tipo_vinculacion) {
                    <span class="badge badge-info">{{ d.tipo_vinculacion }}</span>
                    @if (d.anio_vinculacion) { <div class="sub">{{ d.anio_vinculacion }}</div> }
                  } @else { <span class="text-muted">Sin vincular</span> }
                </td>
                <td class="text-sm">
                  @if (d.nivel_escalafon) {
                    {{ d.nivel_escalafon }}
                    @if (d.categoria_escalafon) { <div class="sub">{{ d.categoria_escalafon }}</div> }
                  } @else { <span class="text-muted">—</span> }
                </td>
                <td>
                  <div class="registros-mini">
                    <span title="Vinculaciones">{{ d.total_vinculaciones ?? 0 }} vinc.</span>
                    <span title="Formaciones">{{ d.total_formaciones ?? 0 }} form.</span>
                    <span title="Evaluaciones">{{ d.total_evaluaciones ?? 0 }} eval.</span>
                  </div>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="d.estado === 'Activo'"
                        [class.badge-warning]="d.estado !== 'Activo'">{{ d.estado }}</span>
                </td>
                <td class="text-right">
                  <a [routerLink]="['/docentes', d.id]" class="btn btn-ghost btn-sm">Ver ficha</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPaginas() > 1) {
        <div class="paginacion">
          <button class="btn btn-ghost btn-sm" [disabled]="pagina() === 1" (click)="cargar(pagina() - 1)">Anterior</button>
          <span>Página {{ pagina() }} de {{ totalPaginas() }} · {{ total() }} docentes</span>
          <button class="btn btn-ghost btn-sm" [disabled]="pagina() >= totalPaginas()" (click)="cargar(pagina() + 1)">Siguiente</button>
        </div>
      } @else {
        <div class="paginacion"><span>{{ total() }} docente(s)</span></div>
      }
    }
  `,
  styles: [`
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
      h1 { font-size: 1.6rem; margin-bottom: 4px; }
      p { font-size: 0.95rem; max-width: 72ch; }
    }
    .acciones { display: flex; gap: 10px; flex-wrap: wrap; }

    .filtros {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px;
      .form-control { width: auto; min-width: 165px; }
      .anio { min-width: 120px; max-width: 130px; }
    }

    .buscador { position: relative; flex: 1; min-width: 260px; display: flex; align-items: center; }
    .buscador svg { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
    .buscador input { width: 100%; padding-left: 36px; }

    .table-wrap { overflow-x: auto; }

    .link-docente { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
    .link-docente:hover strong { color: var(--primary); }

    .avatar-sm {
      width: 32px; height: 32px; border-radius: 50%; background: var(--border-light);
      color: var(--text-secondary); display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
    }

    .sub { display: block; font-size: 0.76rem; color: var(--text-muted); margin-top: 2px; }
    .text-sm { font-size: 0.88rem; }
    .text-right { text-align: right; white-space: nowrap; }

    .registros-mini { display: flex; gap: 8px; font-size: 0.78rem; color: var(--text-secondary); }

    .paginacion {
      display: flex; justify-content: center; align-items: center; gap: 14px;
      margin-top: 18px; font-size: 0.85rem; color: var(--text-muted);
    }

    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 28px; height: 28px; }
  `]
})
export class DocenteListComponent implements OnInit {
  docentes = signal<Docente[]>([]);
  opciones = signal<OpcionesDocente | null>(null);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  error = signal<string | null>(null);

  filtros: DocenteFiltros = { page: 1, limit: 20 };

  readonly hayFiltros = computed(() =>
    !!(this.filtros.busqueda || this.filtros.estado || this.filtros.tipo_vinculacion
      || this.filtros.nivel_escalafon || this.filtros.anio));

  constructor(private docenteService: DocenteService, private auth: AuthService) {}

  ngOnInit() {
    this.docenteService.opciones().subscribe({
      next: o => this.opciones.set(o),
      error: () => {}   // el listado funciona igual sin catálogos
    });
    this.cargar();
  }

  puedeCrear() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  cargar(pagina = 1) {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(pagina);
    this.docenteService.listar({ ...this.filtros, page: pagina }).subscribe({
      next: res => {
        this.docentes.set(res.data);
        this.total.set(res.total);
        this.totalPaginas.set(res.totalPaginas ?? 1);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'No se pudo cargar el listado de docentes');
        this.cargando.set(false);
      }
    });
  }

  limpiar() {
    this.filtros = { page: 1, limit: 20 };
    this.cargar(1);
  }

  iniciales(d: Docente): string {
    return (d.nombre_completo || '?')
      .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
}
