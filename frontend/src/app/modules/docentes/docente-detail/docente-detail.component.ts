import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Docente, DocenteService, Esquemas, OpcionesDocente } from '../../../core/services/docente.service';
import { AuthService } from '../../../core/services/auth.service';
import { DocenteInfoComponent } from '../components/docente-info/docente-info.component';
import { DocenteVinculacionComponent } from '../components/docente-vinculacion/docente-vinculacion.component';
import { DocenteFormacionComponent } from '../components/docente-formacion/docente-formacion.component';
import { DocenteEscalafonComponent } from '../components/docente-escalafon/docente-escalafon.component';
import { DocenteEvaluacionComponent } from '../components/docente-evaluacion/docente-evaluacion.component';
import { DocenteMejoramientoComponent } from '../components/docente-mejoramiento/docente-mejoramiento.component';
import { DocenteRedComponent } from '../components/docente-red/docente-red.component';
import { DocenteDocumentosComponent } from '../components/docente-documentos/docente-documentos.component';
import { DocenteHistoricoComponent } from '../components/docente-historico/docente-historico.component';

type Pestana =
  | 'info' | 'vinculaciones' | 'formaciones' | 'escalafones' | 'evaluaciones'
  | 'mejoramientos' | 'redes' | 'documentos' | 'historico';

interface DefinicionPestana { id: Pestana; etiqueta: string; icono: string; contador?: (d: Docente) => number | undefined }

@Component({
  selector: 'app-docente-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    DocenteInfoComponent, DocenteVinculacionComponent, DocenteFormacionComponent,
    DocenteEscalafonComponent, DocenteEvaluacionComponent, DocenteMejoramientoComponent,
    DocenteRedComponent, DocenteDocumentosComponent, DocenteHistoricoComponent
  ],
  template: `
    @if (cargando()) {
      <div class="loading-overlay" style="min-height:320px"><div class="spinner spinner-dark"></div></div>
    } @else if (error()) {
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>No se pudo cargar el docente</h3>
        <p>{{ error() }}</p>
        <a routerLink="/docentes" class="btn btn-primary" style="margin-top:16px">Volver al listado</a>
      </div>
    } @else {
      @if (docente(); as d) {
      <nav class="breadcrumbs">
        <a routerLink="/docentes">Docentes</a>
        <span>/</span>
        <span>{{ docente()?.numero_docente }}</span>
      </nav>

      <header class="perfil-head">
        <div>
          <h1>{{ docente()?.nombre_completo }}</h1>
          <p class="text-muted">
            {{ docente()?.cargo || 'Docente' }}
            @if (docente()?.area_enfoque) { · Área: {{ docente()?.area_enfoque }} }
          </p>
        </div>
        @if (puedeEditar()) {
          <div class="acciones">
            <a [routerLink]="['/docentes', docente()?.id, 'editar']" class="btn btn-ghost">
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
        @for (p of pestanasVisibles(); track p.id) {
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
                <app-docente-info [docente]="d" [opciones]="op" (actualizado)="aplicarActualizacion($event)" />
              }
              @case ('vinculaciones') {
                <app-docente-vinculacion [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('formaciones') {
                <app-docente-formacion [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('escalafones') {
                <app-docente-escalafon [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('evaluaciones') {
                <app-docente-evaluacion [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('mejoramientos') {
                <app-docente-mejoramiento [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('redes') {
                <app-docente-red [docenteId]="d.id" [esquemas]="es" [opciones]="op" />
              }
              @case ('documentos') {
                <app-docente-documentos [docenteId]="d.id" [opciones]="op" />
              }
              @case ('historico') {
                <app-docente-historico [docenteId]="d.id" />
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
export class DocenteDetailComponent implements OnInit {
  docente = signal<Docente | null>(null);
  esquemas = signal<Esquemas | null>(null);
  opciones = signal<OpcionesDocente | null>(null);
  pestanaActiva = signal<Pestana>('info');
  cargando = signal(true);
  error = signal<string | null>(null);

  /**
   * Se recorta para los roles de solo lectura. No es la única barrera:
   * el backend restringe por `docentes.usuario_id`, esto solo evita
   * mostrar pestañas que el servidor ya rechazaría.
   */
  pestanas: DefinicionPestana[] = [
    { id: 'info', etiqueta: 'Información', icono: 'info' },
    { id: 'vinculaciones', etiqueta: 'Vinculación', icono: 'link',
      contador: d => d.conteos?.vinculaciones },
    { id: 'formaciones', etiqueta: 'Formación', icono: 'book',
      contador: d => d.conteos?.formaciones },
    { id: 'escalafones', etiqueta: 'Escalafón', icono: 'award',
      contador: d => d.conteos?.escalafones },
    { id: 'evaluaciones', etiqueta: 'Evaluación', icono: 'star',
      contador: d => d.conteos?.evaluaciones },
    { id: 'mejoramientos', etiqueta: 'Mejoramiento', icono: 'trend',
      contador: d => d.conteos?.mejoramientos },
    { id: 'redes', etiqueta: 'Redes', icono: 'globe',
      contador: d => d.conteos?.redes },
    { id: 'documentos', etiqueta: 'Evidencias', icono: 'paperclip' },
    { id: 'historico', etiqueta: 'Histórico', icono: 'clock' }
  ];

  /**
   * El rol `docente` no gestiona: se le ocultan las pestañas de edición.
   * Sigue siendo solo comodidad visual; la barrera real está en el backend.
   */
  pestanasVisibles = computed(() => {
    const puedeEditar = this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
    if (puedeEditar) return this.pestanas;
    return this.pestanas.filter(p => ['info', 'documentos', 'historico'].includes(p.id));
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docenteService: DocenteService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pestanaActiva.set(this.leerPestanaDeUrl() ?? 'info');

    // El docente y su configuración se piden en paralelo: una sola espera
    // para los tres, en lugar de tres esperas encadenadas.
    forkJoin({
      docente: this.docenteService.obtener(id),
      config: this.docenteService.configuracion()
    }).subscribe({
      next: res => {
        this.docente.set(res.docente);
        this.esquemas.set(res.config.esquemas);
        this.opciones.set(res.config.opciones);
        this.cargando.set(false);
        this.restringirSegunRol();
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

  /**
   * Un usuario con rol `docente` abre su propia ficha: ve la información,
   * sus evidencias y el histórico. `administrador`, `coordinador` y
   * `evaluador` ven la ficha completa.
   */
  private restringirSegunRol() {
    if (this.puedeEditar() || this.auth.hasRole('evaluador')) return;
    if (!this.auth.hasRole('docente')) return;

    const permitidas: Pestana[] = ['info', 'documentos', 'historico'];
    this.pestanas = this.pestanas.filter(p => permitidas.includes(p.id));
    if (!permitidas.includes(this.pestanaActiva())) {
      this.pestanaActiva.set('info');
    }
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
    const actual = this.docente();
    if (actual) this.docente.set({ ...actual, ...cambios } as Docente);
  }
}
