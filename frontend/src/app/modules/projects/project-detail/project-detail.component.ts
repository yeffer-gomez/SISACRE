import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProyectoService, Proyecto } from '../../../core/services/proyecto.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="back-bar">
      <a routerLink="/proyectos" class="back-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver a proyectos
      </a>
    </div>

    @if (loading()) {
      <div class="loading-overlay" style="padding:80px">
        <div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:36px;height:36px"></div>
        <span>Cargando proyecto...</span>
      </div>
    } @else if (proyecto()) {
      <div class="detail-layout">

        <!-- Cabecera -->
        <div class="card header-card">
          <div class="header-top">
            <div class="proj-icon">🔬</div>
            <div class="header-info">
              <h1>{{ proyecto()!.nombre }}</h1>
              <div class="meta-badges">
                @if (proyecto()!.tipo_proyecto) {
                  <span class="badge badge-primary">{{ proyecto()!.tipo_proyecto }}</span>
                }
                @if (proyecto()!.tipo_producto) {
                  <span class="badge badge-neutral">{{ proyecto()!.tipo_producto }}</span>
                }
                <span class="badge badge-info">{{ proyecto()!.anio_publicacion }}{{ proyecto()!.semestre ? ' / ' + proyecto()!.semestre : '' }}</span>
                @if (proyecto()!.financiado_viis) {
                  <span class="badge" [class]="proyecto()!.financiado_viis === 'Si' ? 'badge-success' : 'badge-neutral'">
                    VIIS: {{ proyecto()!.financiado_viis }}
                  </span>
                }
              </div>
            </div>
          </div>
          <div class="header-actions">
            <a [routerLink]="['/proyectos', proyecto()!.id, 'editar']" class="btn btn-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar Proyecto
            </a>
          </div>
        </div>

        <div class="detail-cols">
          <!-- Columna izquierda -->
          <div class="detail-left">

            @if (proyecto()!.objetivo) {
              <div class="card">
                <div class="card-header"><h3>Objetivo</h3></div>
                <div class="card-body"><p class="content-text">{{ proyecto()!.objetivo }}</p></div>
              </div>
            }

            @if (proyecto()!.resumen) {
              <div class="card">
                <div class="card-header"><h3>Resumen</h3></div>
                <div class="card-body"><p class="content-text">{{ proyecto()!.resumen }}</p></div>
              </div>
            }

            @if (proyecto()!.resultado_proyecto) {
              <div class="card">
                <div class="card-header"><h3>Resultado del Proyecto</h3></div>
                <div class="card-body"><p class="content-text">{{ proyecto()!.resultado_proyecto }}</p></div>
              </div>
            }
          </div>

          <!-- Columna derecha: ficha -->
          <div class="detail-right">
            <div class="card">
              <div class="card-header"><h3>Ficha del Proyecto</h3></div>
              <div class="card-body">
                <dl class="ficha-list">
                  <div class="ficha-item">
                    <dt>Código</dt>
                    <dd>{{ proyecto()!.codigo_proyecto || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Año de publicación</dt>
                    <dd>{{ proyecto()!.anio_publicacion }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Semestre</dt>
                    <dd>{{ proyecto()!.semestre || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Duración</dt>
                    <dd>{{ proyecto()!.duracion || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Fecha de inicio</dt>
                    <dd>{{ proyecto()!.fecha_inicio ? formatDate(proyecto()!.fecha_inicio!) : '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Tipo de producto</dt>
                    <dd>{{ proyecto()!.tipo_producto || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Tipo de proyecto</dt>
                    <dd>{{ proyecto()!.tipo_proyecto || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Objeto socioeconómico</dt>
                    <dd>{{ proyecto()!.objeto_socioeconomico || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Financiado por VIIS</dt>
                    <dd>
                      @if (proyecto()!.financiado_viis) {
                        <span class="badge" [class]="proyecto()!.financiado_viis === 'Si' ? 'badge-success' : 'badge-neutral'">
                          {{ proyecto()!.financiado_viis }}
                        </span>
                      } @else { — }
                    </dd>
                  </div>
                  @if (proyecto()!.link_iisn) {
                    <div class="ficha-item">
                      <dt>Link / ISSN</dt>
                      <dd>
                        @if (proyecto()!.link_iisn!.startsWith('http')) {
                          <a [href]="proyecto()!.link_iisn" target="_blank" class="link-ext">
                            Ver enlace ↗
                          </a>
                        } @else {
                          {{ proyecto()!.link_iisn }}
                        }
                      </dd>
                    </div>
                  }
                  <div class="ficha-item">
                    <dt>Registrado por</dt>
                    <dd>{{ proyecto()!.registrado_por_nombre || '—' }}</dd>
                  </div>
                  <div class="ficha-item">
                    <dt>Fecha de registro</dt>
                    <dd>{{ formatDate(proyecto()!.created_at) }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Proyecto no encontrado</h3>
        <a routerLink="/proyectos" class="btn btn-primary" style="margin-top:16px">Volver al listado</a>
      </div>
    }
  `,
  styles: [`
    .back-bar { margin-bottom: 16px; }
    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--primary); text-decoration: none;
      font-size: 0.9rem; font-weight: 600;
      padding: 6px 14px; border-radius: var(--radius);
      background: rgba(79,70,229,0.1);
      border: 1.5px solid rgba(79,70,229,0.3);
      transition: all 0.2s;
      &:hover { background: var(--primary); color: white; border-color: var(--primary); }
    }

    .detail-layout { display: flex; flex-direction: column; gap: 16px; }

    .header-card { padding: 24px; }
    .header-top { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px; }

    .proj-icon {
      font-size: 2.5rem; width: 64px; height: 64px;
      background: rgba(79,70,229,0.1); border-radius: 14px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .header-info {
      flex: 1;
      h1 { font-size: 1.5rem; margin-bottom: 10px; line-height: 1.3; }
    }

    .meta-badges { display: flex; flex-wrap: wrap; gap: 6px; }

    .header-actions {
      padding-top: 16px; border-top: 1px solid var(--border-light);
      display: flex; gap: 10px;
    }

    .detail-cols {
      display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .detail-left { display: flex; flex-direction: column; gap: 16px; }

    .content-text {
      font-size: 0.95rem; color: var(--text-primary);
      line-height: 1.7; white-space: pre-wrap;
    }

    .ficha-list { display: flex; flex-direction: column; gap: 0; }
    .ficha-item {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);
      &:last-child { border-bottom: none; }

      dt { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
      dd { font-size: 0.9rem; color: var(--text-primary); font-weight: 500; }
    }

    .link-ext {
      color: var(--primary); text-decoration: none; font-weight: 600;
      &:hover { text-decoration: underline; }
    }
  `]
})
export class ProjectDetailComponent implements OnInit {
  proyecto = signal<Proyecto | null>(null);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private proyectoService: ProyectoService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.proyectoService.obtener(id).subscribe({
      next: p => { this.proyecto.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
