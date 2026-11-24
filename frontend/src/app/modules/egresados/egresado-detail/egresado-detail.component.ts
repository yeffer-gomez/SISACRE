import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Egresado, EgresadoService, Esquemas, OpcionesEgresado, DominioEgresado
} from '../../../core/services/egresado.service';
import { AuthService } from '../../../core/services/auth.service';
import { EgresadoInfoComponent } from '../components/egresado-info/egresado-info.component';
import { EgresadoRegistroComponent } from '../components/egresado-registro/egresado-registro.component';

type Pestana = 'info' | DominioEgresado;

@Component({
  selector: 'app-egresado-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, EgresadoInfoComponent, EgresadoRegistroComponent],
  template: `
    @if (cargando()) {
      <div class="loading-overlay" style="min-height:320px"><div class="spinner spinner-dark"></div></div>
    } @else if (error()) {
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>No se pudo cargar el egresado</h3>
        <p>{{ error() }}</p>
        <a routerLink="/egresados" class="btn btn-primary" style="margin-top:16px">Volver al listado</a>
      </div>
    } @else {
      @if (egresado(); as d) {
      <nav class="breadcrumbs">
        <a routerLink="/egresados">Egresados</a>
        <span>/</span>
        <span>{{ d.cedula }}</span>
      </nav>

      <header class="perfil-head">
        <div>
          <h1>{{ d.nombre_completo }}</h1>
          <p class="text-muted">
            C.C. {{ d.cedula }}
            @if (d.titulacion) { · {{ d.titulacion }} }
            @if (d.anio_graduacion) { · Graduado {{ d.anio_graduacion }} }
          </p>
        </div>
        @if (puedeEditar()) {
          <div class="acciones">
            <a [routerLink]="['/egresados', d.id, 'editar']" class="btn btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </a>
          </div>
        }
      </header>

      <nav class="tabs" role="tablist">
        @for (p of pestanas; track p.id) {
          <button
            class="tab"
            [class.activo]="pestanaActiva() === p.id"
            (click)="pestanaSeleccionada(p.id)"
            role="tab"
            [attr.aria-selected]="pestanaActiva() === p.id">
            {{ p.etiqueta }}
            @if (p.contador && (p.contador(d) ?? 0) > 0) {
              <span class="tab-badge">{{ p.contador(d) }}</span>
            }
          </button>
        }
      </nav>

      <div class="panel">
        @if (opciones(); as op) {
          @if (esquemas(); as es) {
            @switch (pestanaActiva()) {
              @case ('info') {
                <app-egresado-info [egresado]="d" (actualizado)="aplicarActualizacion($event)" />
              }
              @case ('grupos') {
                <app-egresado-registro [egresadoId]="d.id" dominio="grupos" [esquemas]="es" [opciones]="op" />
              }
              @case ('posgrados') {
                <app-egresado-registro [egresadoId]="d.id" dominio="posgrados" [esquemas]="es" [opciones]="op" />
              }
              @case ('bienestar') {
                <app-egresado-registro [egresadoId]="d.id" dominio="bienestar" [esquemas]="es" [opciones]="op" />
              }
              @case ('seguimiento-grado') {
                <app-egresado-registro [egresadoId]="d.id" dominio="seguimiento-grado" [esquemas]="es" [opciones]="op" />
              }
              @case ('reconocimientos') {
                <app-egresado-registro [egresadoId]="d.id" dominio="reconocimientos" [esquemas]="es" [opciones]="op" />
              }
            }
          }
        }
      </div>
      }
    }
  `,
  styles: [`
    .breadcrumbs {
      display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;
      a { color: var(--primary); font-weight: 600; }
    }

    .perfil-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
      h1 { font-size: 1.6rem; margin-bottom: 4px; }
      p { font-size: 0.95rem; }
    }

    .tabs {
      display: flex; gap: 2px; border-bottom: 1px solid var(--border);
      overflow-x: auto; margin-bottom: 20px; scrollbar-width: thin;
    }

    .tab {
      border: none; background: none; padding: 11px 15px; cursor: pointer;
      font-size: 0.88rem; font-weight: 600; color: var(--text-secondary);
      border-bottom: 2px solid transparent; white-space: nowrap;
      transition: color 0.2s, border-color 0.2s; display: flex; align-items: center; gap: 6px;
      &:hover { color: var(--primary); }
      &.activo { color: var(--primary); border-bottom-color: var(--primary); }
    }

    .tab-badge {
      background: var(--border-light); border-radius: 100px; padding: 1px 7px;
      font-size: 0.72rem; font-weight: 700; color: var(--text-secondary);
    }
    .tab.activo .tab-badge { background: var(--primary); color: #fff; }

    .panel { min-height: 260px; }

    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 30px; height: 30px; }
  `]
})
export class EgresadoDetailComponent implements OnInit {
  egresado = signal<Egresado | null>(null);
  esquemas = signal<Esquemas | null>(null);
  opciones = signal<OpcionesEgresado | null>(null);
  pestanaActiva = signal<Pestana>('info');
  cargando = signal(true);
  error = signal<string | null>(null);

  pestanas: { id: Pestana; etiqueta: string; contador?: (e: Egresado) => number | undefined }[] = [
    { id: 'info', etiqueta: 'Información' },
    { id: 'grupos', etiqueta: 'Grupos de investigación', contador: e => e.conteos?.grupos },
    { id: 'posgrados', etiqueta: 'Posgrados', contador: e => e.conteos?.posgrados },
    { id: 'bienestar', etiqueta: 'Bienestar', contador: e => e.conteos?.bienestar },
    { id: 'seguimiento-grado', etiqueta: 'Seguimiento al grado', contador: e => e.conteos?.seguimiento_grado },
    { id: 'reconocimientos', etiqueta: 'Reconocimientos', contador: e => e.conteos?.reconocimientos }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private egresadoService: EgresadoService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pestanaActiva.set(this.leerPestanaDeUrl() ?? 'info');

    forkJoin({
      egresado: this.egresadoService.obtener(id),
      config: this.egresadoService.configuracion()
    }).subscribe({
      next: res => {
        this.egresado.set(res.egresado);
        this.esquemas.set(res.config.esquemas);
        this.opciones.set(res.config.opciones);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'Error desconocido');
      }
    });
  }

  puedeEditar() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  private leerPestanaDeUrl(): Pestana | null {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    return this.pestanas.some(p => p.id === tab) ? (tab as Pestana) : null;
  }

  /** Refleja en la URL la pestaña activa para poder compartir el enlace. */
  pestanaSeleccionada(p: Pestana) {
    this.pestanaActiva.set(p);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: p === 'info' ? null : p },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  aplicarActualizacion(cambios: Record<string, any>) {
    const actual = this.egresado();
    if (actual) this.egresado.set({ ...actual, ...cambios } as Egresado);
  }
}
