import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentoService } from '../../core/services/documento.service';
import { FactorService } from '../../core/services/factor.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="text-muted">Bienvenido, {{ auth.currentUser()?.nombre }}</p>
      </div>
      <a routerLink="/documentos/nuevo" class="btn btn-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Cargar Documento
      </a>
    </div>

    <!-- Stat Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats()?.totalDocumentos ?? '–' }}</span>
          <span class="stat-label">Total Documentos</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon gold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ totalFactores() }}</span>
          <span class="stat-label">Factores</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ anioActual }}</span>
          <span class="stat-label">Año de Referencia</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ topFactor() }}</span>
          <span class="stat-label">Factor con más docs.</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Documents by factor -->
      <div class="card">
        <div class="card-header">
          <h3>Documentos por Factor</h3>
          <a routerLink="/documentos" class="btn btn-ghost btn-sm">Ver todos</a>
        </div>
        <div class="card-body">
          @if (loading()) {
            <div class="loading-overlay"><div class="spinner" style="border-color:var(--primary);border-top-color:transparent"></div></div>
          } @else {
            <div class="factor-bars">
              @for (item of stats()?.porFactor?.slice(0,8) ?? []; track item.factor) {
                <div class="factor-bar-row">
                  <span class="factor-label">{{ item.factor }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="barWidth(item.total)"></div>
                  </div>
                  <span class="bar-value">{{ item.total }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Recent documents by year -->
      <div class="card">
        <div class="card-header">
          <h3>Documentos por Año</h3>
        </div>
        <div class="card-body">
          @if (!loading()) {
            <div class="year-list">
              @for (item of stats()?.porAnio ?? []; track item.anio) {
                <div class="year-item">
                  <div class="year-badge">{{ item.anio }}</div>
                  <div class="year-bar-track">
                    <div class="year-bar-fill" [style.width.%]="barWidthAnio(item.total)"></div>
                  </div>
                  <span class="year-count">{{ item.total }} docs.</span>
                </div>
              }
              @empty {
                <p class="text-muted text-sm">Sin datos disponibles</p>
              }
            </div>

            <div class="type-section">
              <h4>Por tipo de evidencia</h4>
              <div class="type-tags">
                @for (item of stats()?.porTipo?.slice(0,6) ?? []; track item.tipo) {
                  <div class="type-tag">
                    <span>{{ item.tipo }}</span>
                    <span class="badge badge-primary">{{ item.total }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="quick-actions">
      <h3>Acciones rápidas</h3>
      <div class="actions-grid">
        <a routerLink="/documentos/nuevo" class="action-card">
          <div class="action-icon">📄</div>
          <span>Cargar Documento</span>
        </a>
        <a routerLink="/documentos" class="action-card">
          <div class="action-icon">🔍</div>
          <span>Buscar Evidencias</span>
        </a>
        <a routerLink="/proyectos/nuevo" class="action-card">
          <div class="action-icon">🔬</div>
          <span>Nuevo Proyecto</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;

      h1 { font-size: 1.875rem; margin-bottom: 4px; }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--surface-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), border-color 0.2s var(--ease);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.blue { background: rgba(79,70,229,0.12); color: var(--primary); }
      &.gold { background: rgba(245,158,11,0.16); color: var(--warm-strong); }
      &.green { background: rgba(124,58,237,0.12); color: var(--accent); }
      &.orange { background: rgba(8,145,178,0.13); color: var(--info); }
    }

    @media (hover: hover) and (pointer: fine) {
      .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow);
        border-color: var(--border);
      }
    }

    .stat-value {
      display: block;
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-top: 6px;
      display: block;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;

      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .factor-bars { display: flex; flex-direction: column; gap: 10px; }

    .factor-bar-row {
      display: grid;
      grid-template-columns: 120px 1fr 36px;
      align-items: center;
      gap: 10px;
    }

    .factor-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bar-track {
      height: 8px;
      background: var(--surface-sunken);
      border-radius: 100px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary-dark), var(--primary-light));
      border-radius: 100px;
      transition: width 0.6s var(--ease-out);
      min-width: 4px;
    }

    .bar-value { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-align: right; }

    .year-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

    .year-item {
      display: grid;
      grid-template-columns: 60px 1fr 60px;
      align-items: center;
      gap: 12px;
    }

    .year-badge {
      background: var(--primary);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 8px;
      text-align: center;
    }

    .year-bar-track { height: 6px; background: var(--surface-sunken); border-radius: 100px; }
    .year-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 100px; min-width: 4px; transition: width 0.6s var(--ease-out); }
    .year-count { font-size: 0.8rem; color: var(--text-muted); text-align: right; }

    .type-section h4 { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
    .type-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .type-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .quick-actions h3 { font-size: 1.125rem; margin-bottom: 14px; }
    .actions-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 20px 28px;
      background: var(--surface-card);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: var(--shadow-sm);
      transition: background-color 0.18s var(--ease), color 0.18s var(--ease),
                  border-color 0.18s var(--ease), box-shadow 0.2s var(--ease-out),
                  transform 0.2s var(--ease-out);

      &:hover {
        border-color: var(--primary);
        background: var(--primary);
        color: white;
        box-shadow: var(--shadow);
      }
    }

    @media (hover: hover) and (pointer: fine) {
      .action-card:hover { transform: translateY(-3px); }
    }

    .action-icon { font-size: 1.75rem; }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<any>(null);
  loading = signal(true);
  anioActual = new Date().getFullYear();

  constructor(
    private docService: DocumentoService,
    private factorService: FactorService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.docService.estadisticas().subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  totalFactores(): number {
    return this.stats()?.porFactor?.length ?? 0;
  }

  topFactor(): string {
    const factors = this.stats()?.porFactor;
    if (!factors?.length) return '–';
    const top = factors.reduce((a: any, b: any) => +a.total > +b.total ? a : b);
    return top.factor?.split(' ').slice(0, 2).join(' ') ?? '–';
  }

  barWidth(total: number): number {
    const max = Math.max(...(this.stats()?.porFactor?.map((f: any) => +f.total) ?? [1]));
    return max > 0 ? (+total / max) * 100 : 0;
  }

  barWidthAnio(total: number): number {
    const max = Math.max(...(this.stats()?.porAnio?.map((a: any) => +a.total) ?? [1]));
    return max > 0 ? (+total / max) * 100 : 0;
  }
}
