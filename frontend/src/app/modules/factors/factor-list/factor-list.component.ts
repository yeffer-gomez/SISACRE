import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FactorService, Factor, Caracteristica } from '../../../core/services/factor.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-factor-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Factores de Acreditación</h1>
        <p class="text-muted">Factores CNA del Programa de Psicología</p>
      </div>
      @if (auth.hasRole('administrador') || auth.hasRole('coordinador')) {
        <button class="btn btn-accent" (click)="mostrarFormFactor.set(true)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Factor
        </button>
      }
    </div>

    <!-- New Factor Modal -->
    @if (mostrarFormFactor()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="card-header" style="padding:20px 24px">
            <h3>{{ editandoFactor() ? 'Editar Factor' : 'Nuevo Factor' }}</h3>
            <button class="btn btn-ghost btn-icon" (click)="mostrarFormFactor.set(false)">✕</button>
          </div>
          <div style="padding:24px">
            @if (errorFactor()) {
              <div class="alert alert-danger" style="margin-bottom:14px">{{ errorFactor() }}</div>
            }
            <div class="form-grid-2">
              <div class="form-group">
                <label>Código <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="factorForm.codigo" placeholder="Ej: F13" />
              </div>
              <div class="form-group">
                <label>Nombre <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="factorForm.nombre" placeholder="Nombre del factor" />
              </div>
              <div class="form-group" style="grid-column:span 2">
                <label>Descripción</label>
                <textarea class="form-control" [(ngModel)]="factorForm.descripcion" rows="2"></textarea>
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-outline" (click)="mostrarFormFactor.set(false)">Cancelar</button>
              <button class="btn btn-primary" (click)="guardarFactor()" [disabled]="guardandoFactor()">
                @if (guardandoFactor()) { <span class="spinner"></span> }
                {{ editandoFactor() ? 'Guardar cambios' : 'Crear Factor' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Característica Modal -->
    @if (mostrarFormCaract()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="card-header" style="padding:20px 24px">
            <h3>Nueva Característica — {{ factorSeleccionado()?.nombre }}</h3>
            <button class="btn btn-ghost btn-icon" (click)="mostrarFormCaract.set(false)">✕</button>
          </div>
          <div style="padding:24px">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Código <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="caractForm.codigo" placeholder="Ej: F13C1" />
              </div>
              <div class="form-group">
                <label>Nombre <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="caractForm.nombre" placeholder="Nombre de la característica" />
              </div>
              <div class="form-group" style="grid-column:span 2">
                <label>Descripción</label>
                <textarea class="form-control" [(ngModel)]="caractForm.descripcion" rows="2"></textarea>
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-outline" (click)="mostrarFormCaract.set(false)">Cancelar</button>
              <button class="btn btn-primary" (click)="guardarCaract()" [disabled]="guardandoCaract()">
                @if (guardandoCaract()) { <span class="spinner"></span> } Crear
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Factors grid -->
    @if (loading()) {
      <div class="loading-overlay"><div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:32px;height:32px"></div></div>
    } @else {
      <div class="factors-grid">
        @for (factor of factores(); track factor.id) {
          <div class="factor-card" [class.expanded]="expandido() === factor.id">
            <div class="factor-card-header" (click)="toggleExpand(factor)">
              <div class="factor-code">{{ factor.codigo }}</div>
              <div class="factor-info">
                <h3>{{ factor.nombre }}</h3>
                <div class="factor-stats">
                  <span class="badge badge-primary">{{ factor.total_caracteristicas ?? 0 }} características</span>
                  <span class="badge badge-neutral">{{ factor.total_documentos ?? 0 }} documentos</span>
                </div>
              </div>
              <div class="factor-actions" (click)="$event.stopPropagation()">
                @if (auth.hasRole('administrador') || auth.hasRole('coordinador')) {
                  <button class="btn btn-ghost btn-icon btn-sm" title="Agregar característica" (click)="abrirFormCaract(factor)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  <button class="btn btn-ghost btn-icon btn-sm" title="Editar" (click)="editarFactor(factor)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                }
                <a [routerLink]="['/documentos']" [queryParams]="{factor_id: factor.id}" class="btn btn-ghost btn-icon btn-sm" title="Ver documentos">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  </svg>
                </a>
                <button class="expand-btn" [class.open]="expandido() === factor.id">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            @if (expandido() === factor.id) {
              <div class="factor-card-body">
                @if (factor.descripcion) {
                  <p class="factor-desc">{{ factor.descripcion }}</p>
                }
                @if (caracteristicasMap()[factor.id]?.length) {
                  <div class="caracteristicas-list">
                    <h4>Características</h4>
                    @for (c of caracteristicasMap()[factor.id]; track c.id) {
                      <div class="caract-item">
                        <span class="caract-code">{{ c.codigo }}</span>
                        <span class="caract-name">{{ c.nombre }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-muted text-sm" style="padding:8px 0">Sin características registradas.</p>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { font-size: 1.75rem; margin-bottom: 4px; }
    }

    .factors-grid { display: flex; flex-direction: column; gap: 10px; }

    .factor-card {
      background: white;
      border: 1.5px solid var(--border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      transition: border-color 0.2s;

      &.expanded { border-color: var(--primary-light); }
    }

    .factor-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
      &:hover { background: #f8fafc; }
    }

    .factor-code {
      background: var(--primary);
      color: white;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 6px 12px;
      border-radius: 8px;
      min-width: 48px;
      text-align: center;
      flex-shrink: 0;
    }

    .factor-info {
      flex: 1;
      min-width: 0;
      h3 { font-size: 1rem; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }

    .factor-stats { display: flex; gap: 6px; flex-wrap: wrap; }

    .factor-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .expand-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      transition: transform 0.2s;
      &.open { transform: rotate(180deg); }
    }

    .factor-card-body {
      padding: 16px 20px 20px;
      border-top: 1px solid var(--border-light);
      background: var(--surface);
    }

    .factor-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 14px;
      line-height: 1.5;
    }

    .caracteristicas-list {
      h4 { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; }
    }

    .caract-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      background: white;
      border: 1px solid var(--border-light);
      margin-bottom: 6px;
    }

    .caract-code {
      background: rgba(79,70,229,0.1);
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .caract-name { font-size: 0.875rem; color: var(--text-primary); }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      @media (max-width: 500px) { grid-template-columns: 1fr; }
    }
  `]
})
export class FactorListComponent implements OnInit {
  factores = signal<Factor[]>([]);
  loading = signal(true);
  expandido = signal<number | null>(null);
  caracteristicasMap = signal<Record<number, Caracteristica[]>>({});
  mostrarFormFactor = signal(false);
  mostrarFormCaract = signal(false);
  editandoFactor = signal<Factor | null>(null);
  factorSeleccionado = signal<Factor | null>(null);
  guardandoFactor = signal(false);
  guardandoCaract = signal(false);
  errorFactor = signal('');

  factorForm = { codigo: '', nombre: '', descripcion: '' };
  caractForm = { codigo: '', nombre: '', descripcion: '' };

  constructor(private factorService: FactorService, public auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.factorService.listar().subscribe({
      next: (data) => { this.factores.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  toggleExpand(factor: Factor) {
    if (this.expandido() === factor.id) {
      this.expandido.set(null);
    } else {
      this.expandido.set(factor.id);
      if (!this.caracteristicasMap()[factor.id]) {
        this.factorService.listarCaracteristicas(factor.id).subscribe(data => {
          this.caracteristicasMap.update(m => ({ ...m, [factor.id]: data }));
        });
      }
    }
  }

  editarFactor(factor: Factor) {
    this.editandoFactor.set(factor);
    this.factorForm = { codigo: factor.codigo, nombre: factor.nombre, descripcion: factor.descripcion ?? '' };
    this.mostrarFormFactor.set(true);
  }

  guardarFactor() {
    if (!this.factorForm.codigo || !this.factorForm.nombre) { this.errorFactor.set('Código y nombre son obligatorios'); return; }
    this.guardandoFactor.set(true);
    this.errorFactor.set('');

    const obs = this.editandoFactor()
      ? this.factorService.actualizar(this.editandoFactor()!.id, { ...this.factorForm })
      : this.factorService.crear({ ...this.factorForm });

    obs.subscribe({
      next: () => {
        this.mostrarFormFactor.set(false);
        this.editandoFactor.set(null);
        this.factorForm = { codigo: '', nombre: '', descripcion: '' };
        this.guardandoFactor.set(false);
        this.cargar();
      },
      error: (err) => {
        this.errorFactor.set(err.error?.message || 'Error al guardar');
        this.guardandoFactor.set(false);
      }
    });
  }

  abrirFormCaract(factor: Factor) {
    this.factorSeleccionado.set(factor);
    this.caractForm = { codigo: '', nombre: '', descripcion: '' };
    this.mostrarFormCaract.set(true);
  }

  guardarCaract() {
    if (!this.caractForm.codigo || !this.caractForm.nombre) return;
    this.guardandoCaract.set(true);
    const factorId = this.factorSeleccionado()!.id;
    this.factorService.crearCaracteristica(factorId, { ...this.caractForm }).subscribe({
      next: () => {
        this.mostrarFormCaract.set(false);
        this.guardandoCaract.set(false);
        this.caractForm = { codigo: '', nombre: '', descripcion: '' };
        this.factorService.listarCaracteristicas(factorId).subscribe(data => {
          this.caracteristicasMap.update(m => ({ ...m, [factorId]: data }));
        });
        this.cargar();
      },
      error: () => this.guardandoCaract.set(false)
    });
  }

  cerrarModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.mostrarFormFactor.set(false);
      this.mostrarFormCaract.set(false);
    }
  }
}
