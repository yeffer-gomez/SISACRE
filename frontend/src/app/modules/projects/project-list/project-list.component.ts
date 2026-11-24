import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { ProyectoService, Proyecto, ProyectoFiltros } from '../../../core/services/proyecto.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Proyectos de Investigación</h1>
        <p class="text-muted">{{ total() }} proyecto(s) registrado(s)</p>
      </div>
      <a routerLink="/proyectos/nuevo" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo Proyecto
      </a>
    </div>

    <!-- Filtros -->
    <div class="card filters-card">
      <div class="filters-grid">
        <div class="form-group">
          <label>Buscar</label>
          <input type="text" class="form-control" [(ngModel)]="filtros.busqueda"
            placeholder="Nombre, objetivo, código..." (input)="buscarConDebounce()" />
        </div>
        <div class="form-group">
          <label>Tipo de Proyecto</label>
          <select class="form-control" [(ngModel)]="filtros.tipo_proyecto" (change)="buscar()">
            <option value="">Todos</option>
            @for (t of tiposProyecto; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Tipo de Producto</label>
          <select class="form-control" [(ngModel)]="filtros.tipo_producto" (change)="buscar()">
            <option value="">Todos</option>
            @for (t of tiposProducto; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Año</label>
          <select class="form-control" [(ngModel)]="filtros.anio" (change)="buscar()">
            <option [ngValue]="undefined">Todos</option>
            @for (a of anios; track a) {
              <option [ngValue]="a">{{ a }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Semestre</label>
          <select class="form-control" [(ngModel)]="filtros.semestre" (change)="buscar()">
            <option value="">Todos</option>
            <option value="A">Semestre A</option>
            <option value="B">Semestre B</option>
          </select>
        </div>
        <div class="form-group align-end">
          <button class="btn btn-ghost" (click)="limpiarFiltros()">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:32px;height:32px"></div>
          <span>Cargando proyectos...</span>
        </div>
      } @else if (proyectos().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🔬</div>
          <h3>No se encontraron proyectos</h3>
          <p>Registra el primer proyecto de investigación</p>
          <a routerLink="/proyectos/nuevo" class="btn btn-primary" style="margin-top:16px">Nuevo Proyecto</a>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="sisacre-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Tipo de Proyecto</th>
                <th>Producto</th>
                <th>Año / Sem.</th>
                <th>VIIS</th>
                <th>Código</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of proyectos(); track p.id) {
                <tr>
                  <td>
                    <div class="proj-name">{{ p.nombre }}</div>
                    @if (p.objetivo) {
                      <div class="proj-obj">{{ p.objetivo | slice:0:70 }}{{ p.objetivo!.length > 70 ? '...' : '' }}</div>
                    }
                  </td>
                  <td>
                    @if (p.tipo_proyecto) {
                      <span class="badge badge-primary tipo-badge">{{ p.tipo_proyecto }}</span>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td>
                    @if (p.tipo_producto) {
                      <span class="badge badge-neutral">{{ p.tipo_producto }}</span>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td>
                    <span class="fw-600">{{ p.anio_publicacion }}</span>
                    @if (p.semestre) { <span class="text-muted"> / {{ p.semestre }}</span> }
                  </td>
                  <td>
                    @if (p.financiado_viis) {
                      <span class="badge" [class]="p.financiado_viis === 'Si' ? 'badge-success' : 'badge-neutral'">
                        {{ p.financiado_viis }}
                      </span>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td class="text-sm">{{ p.codigo_proyecto || '—' }}</td>
                  <td>
                    <div class="action-btns">
                      <a [routerLink]="['/proyectos', p.id]" class="btn btn-ghost btn-icon btn-sm" title="Ver detalle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      <a [routerLink]="['/proyectos', p.id, 'editar']" class="btn btn-ghost btn-icon btn-sm" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </a>
                      @if (auth.hasRole('administrador') || auth.hasRole('coordinador')) {
                        <button class="btn btn-ghost btn-icon btn-sm" title="Eliminar" (click)="eliminar(p)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (totalPaginas() > 1) {
          <div class="pagination">
            <button (click)="irPagina(pagina() - 1)" [disabled]="pagina() === 1">← Anterior</button>
            @for (p of pageNumbers(); track p) {
              <button [class.active]="p === pagina()" (click)="irPagina(p)">{{ p }}</button>
            }
            <button (click)="irPagina(pagina() + 1)" [disabled]="pagina() === totalPaginas()">Siguiente →</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
      h1 { font-size: 1.75rem; margin-bottom: 4px; }
      p { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
    }

    .filters-card { margin-bottom: 16px; padding: 20px; }
    .filters-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px;
    }
    .align-end { align-self: flex-end; }

    .proj-name { font-weight: 600; font-size: 0.925rem; color: var(--text-primary); }
    .proj-obj { margin-top: 3px; font-size: 0.82rem; color: var(--text-secondary); }

    .tipo-badge { max-width: 200px; white-space: normal; line-height: 1.3; padding: 4px 8px; }

    .action-btns { display: flex; gap: 4px; }
  `]
})
export class ProjectListComponent implements OnInit {
  proyectos = signal<Proyecto[]>([]);
  loading = signal(true);
  total = signal(0);
  totalPaginas = signal(1);
  pagina = signal(1);
  filtros: ProyectoFiltros = {};
  anios: number[] = [];
  tiposProyecto: string[] = [];
  tiposProducto: string[] = [];
  private debounceTimer: any;

  constructor(private proyectoService: ProyectoService, public auth: AuthService) {}

  ngOnInit() {
    const y = new Date().getFullYear();
    this.anios = Array.from({ length: 10 }, (_, i) => y - i);
    this.proyectoService.opciones().subscribe(op => {
      this.tiposProyecto = op.TIPOS_PROYECTO;
      this.tiposProducto = op.TIPOS_PRODUCTO;
    });
    this.buscar();
  }

  buscarConDebounce() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.buscar(), 400);
  }

  buscar() { this.pagina.set(1); this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.proyectoService.listar({ ...this.filtros, page: this.pagina(), limit: 15 }).subscribe({
      next: res => { this.proyectos.set(res.data); this.total.set(res.total); this.totalPaginas.set(res.totalPaginas); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  limpiarFiltros() { this.filtros = {}; this.buscar(); }
  irPagina(p: number) { this.pagina.set(p); this.cargar(); }
  pageNumbers() { return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1); }

  eliminar(p: Proyecto) {
    if (confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) {
      this.proyectoService.eliminar(p.id).subscribe(() => this.cargar());
    }
  }
}
