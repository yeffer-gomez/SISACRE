import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Egresado, EgresadoFiltros, EgresadoService, OpcionesEgresado } from '../../../core/services/egresado.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-egresado-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>Egresados</h1>
        <p class="text-muted">
          Egresados del programa: identificación, vinculación a grupos y posgrados, bienestar,
          seguimiento al grado y reconocimientos (Factor 4).
        </p>
      </div>
      <div class="acciones">
        <a routerLink="/egresados/estadisticas" class="btn btn-ghost">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Estadísticas
        </a>
        <a routerLink="/egresados/catalogo/politicas" class="btn btn-ghost">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Políticas
        </a>
        <a routerLink="/egresados/catalogo/formacion-continua" class="btn btn-ghost">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          Formación continua
        </a>
        @if (puedeCrear()) {
          <a routerLink="/egresados/nuevo" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo egresado
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
               placeholder="Buscar por nombre, cédula o titulación"
               [(ngModel)]="filtros.busqueda" name="busqueda"
               (keyup.enter)="cargar(1)" />
      </div>
      <select class="form-control" [(ngModel)]="filtros.anio" name="anio" (change)="cargar(1)">
        <option [ngValue]="null">Todos los años</option>
        @for (a of opciones()?.ANIOS ?? []; track a) { <option [ngValue]="a">{{ a }}</option> }
      </select>
      @if (hayFiltros()) {
        <button class="btn btn-ghost" (click)="limpiar()">Limpiar</button>
      }
    </div>

    @if (cargando()) {
      <div class="loading-overlay" style="min-height:280px"><div class="spinner spinner-dark"></div></div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (egresados().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">🎓</div>
        <h3>{{ hayFiltros() ? 'Sin resultados' : 'Aún no hay egresados' }}</h3>
        <p>{{ hayFiltros() ? 'Prueba a quitar algún filtro.' : 'Registra el primer egresado para empezar a construir la ficha del Factor 4.' }}</p>
        @if (hayFiltros()) {
          <button class="btn btn-ghost" style="margin-top:16px" (click)="limpiar()">Limpiar filtros</button>
        } @else if (puedeCrear()) {
          <a routerLink="/egresados/nuevo" class="btn btn-primary" style="margin-top:16px">Registrar egresado</a>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Egresado</th>
              <th>Titulación</th>
              <th>Año</th>
              <th>Contacto</th>
              <th>Registros</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (e of egresados(); track e.id) {
              <tr>
                <td>
                  <a [routerLink]="['/egresados', e.id]" class="link-egresado">
                    <span class="avatar-sm">{{ iniciales(e) }}</span>
                    <span>
                      <strong>{{ e.nombre_completo }}</strong>
                      <span class="sub">C.C. {{ e.cedula }}</span>
                    </span>
                  </a>
                </td>
                <td class="text-sm">{{ e.titulacion || '—' }}</td>
                <td class="text-sm">{{ e.anio_graduacion || '—' }}</td>
                <td class="text-sm">
                  @if (e.correo) { <div>{{ e.correo }}</div> }
                  @if (e.telefono) { <div class="sub">{{ e.telefono }}</div> }
                  @if (!e.correo && !e.telefono) { <span class="text-muted">—</span> }
                </td>
                <td>
                  <div class="registros-mini">
                    <span title="Grupos de investigación">{{ e.total_grupos ?? 0 }} gr.</span>
                    <span title="Posgrados">{{ e.total_posgrados ?? 0 }} pos.</span>
                    <span title="Bienestar">{{ e.total_bienestar ?? 0 }} bien.</span>
                  </div>
                </td>
                <td class="text-right">
                  <a [routerLink]="['/egresados', e.id]" class="btn btn-ghost btn-sm">Ver ficha</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPaginas() > 1) {
        <div class="paginacion">
          <button class="btn btn-ghost btn-sm" [disabled]="pagina() === 1" (click)="cargar(pagina() - 1)">Anterior</button>
          <span>Página {{ pagina() }} de {{ totalPaginas() }} · {{ total() }} egresados</span>
          <button class="btn btn-ghost btn-sm" [disabled]="pagina() >= totalPaginas()" (click)="cargar(pagina() + 1)">Siguiente</button>
        </div>
      } @else {
        <div class="paginacion"><span>{{ total() }} egresado(s)</span></div>
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
    }

    .buscador { position: relative; flex: 1; min-width: 260px; display: flex; align-items: center; }
    .buscador svg { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
    .buscador input { width: 100%; padding-left: 36px; }

    .table-wrap { overflow-x: auto; }

    .link-egresado { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
    .link-egresado:hover strong { color: var(--primary); }

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
export class EgresadoListComponent implements OnInit {
  egresados = signal<Egresado[]>([]);
  opciones = signal<OpcionesEgresado | null>(null);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  error = signal<string | null>(null);

  filtros: EgresadoFiltros = { page: 1, limit: 20, anio: undefined };

  readonly hayFiltros = computed(() => !!this.filtros.busqueda || !!this.filtros.anio);

  constructor(private egresadoService: EgresadoService, private auth: AuthService) {}

  ngOnInit() {
    this.egresadoService.opciones().subscribe({
      next: o => this.opciones.set(o),
      error: () => {}
    });
    this.cargar(1);
  }

  puedeCrear() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  cargar(pagina: number) {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(pagina);
    this.egresadoService.listar({ ...this.filtros, page: pagina }).subscribe({
      next: res => {
        this.egresados.set(res.data);
        this.total.set(res.total);
        this.totalPaginas.set(res.totalPaginas);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'No se pudieron cargar los egresados');
      }
    });
  }

  limpiar() {
    this.filtros = { page: 1, limit: 20, anio: undefined };
    this.cargar(1);
  }

  iniciales(e: Egresado): string {
    return (e.nombre_completo || '?')
      .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
}
