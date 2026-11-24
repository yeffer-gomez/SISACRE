import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { DocumentoService, Documento, DocumentoFiltros } from '../../../core/services/documento.service';
import { FactorService, Factor, TipoEvidencia } from '../../../core/services/factor.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [FormsModule, RouterLink, SlicePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Documentos y Evidencias</h1>
        <p class="text-muted">{{ total() }} documento(s) encontrado(s)</p>
      </div>
      <a routerLink="/documentos/nuevo" class="btn btn-accent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Cargar Documento
      </a>
    </div>

    <!-- Filtros -->
    <div class="card filters-card">
      <div class="filters-grid">
        <div class="form-group">
          <label>Buscar</label>
          <input type="text" class="form-control" [(ngModel)]="filtros.busqueda" placeholder="Título o descripción..." (input)="buscarConDebounce()" />
        </div>
        <div class="form-group">
          <label>Factor</label>
          <select class="form-control" [(ngModel)]="filtros.factor_id" (change)="onFactorChange()">
            <option [ngValue]="undefined">Todos los factores</option>
            @for (f of factores(); track f.id) {
              <option [ngValue]="f.id">{{ f.codigo }} - {{ f.nombre }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Tipo de Evidencia</label>
          <select class="form-control" [(ngModel)]="filtros.tipo_evidencia_id" (change)="buscar()">
            <option [ngValue]="undefined">Todos los tipos</option>
            @for (t of tipos(); track t.id) {
              <option [ngValue]="t.id">{{ t.nombre }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Año</label>
          <select class="form-control" [(ngModel)]="filtros.anio" (change)="buscar()">
            <option [ngValue]="undefined">Todos los años</option>
            @for (a of anios; track a) {
              <option [ngValue]="a">{{ a }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label>Semestre</label>
          <select class="form-control" [(ngModel)]="filtros.semestre" (change)="buscar()">
            <option [ngValue]="undefined">Todos</option>
            <option value="A">Semestre A</option>
            <option value="B">Semestre B</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
        <div class="form-group align-end">
          <button class="btn btn-ghost" (click)="limpiarFiltros()">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Document list -->
    <div class="card">
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:32px;height:32px"></div>
          <span>Cargando documentos...</span>
        </div>
      } @else if (documentos().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h3>No se encontraron documentos</h3>
          <p>Intenta cambiar los filtros o <a routerLink="/documentos/nuevo">carga el primer documento</a></p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="sisacre-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Factor</th>
                <th>Tipo</th>
                <th>Año / Sem.</th>
                <th>Responsable</th>
                <th>Archivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (doc of documentos(); track doc.id) {
                <tr>
                  <td>
                    <div class="doc-title">{{ doc.titulo }}</div>
                    @if (doc.descripcion) {
                      <div class="doc-desc text-muted text-xs">{{ doc.descripcion | slice:0:60 }}...</div>
                    }
                  </td>
                  <td>
                    @if (doc.factor_codigo) {
                      <span class="badge badge-primary">{{ doc.factor_codigo }}</span>
                    } @else {
                      <span class="text-muted">–</span>
                    }
                  </td>
                  <td>
                    @if (doc.tipo_evidencia) {
                      <span class="badge badge-neutral">{{ doc.tipo_evidencia }}</span>
                    }
                  </td>
                  <td>
                    <span class="fw-600">{{ doc.anio }}</span>
                    @if (doc.semestre) { <span class="text-muted"> / {{ doc.semestre }}</span> }
                  </td>
                  <td class="text-sm">{{ doc.responsable ?? '–' }}</td>
                  <td>
                    <div class="file-badge" [class]="getFileClass(doc.tipo_mime)">
                      <span>{{ getFileExt(doc.nombre_original) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="action-btns">
                      <a [routerLink]="['/documentos', doc.id]" class="btn btn-ghost btn-icon btn-sm" title="Ver detalles">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      <button class="btn btn-ghost btn-icon btn-sm" title="Descargar" (click)="descargar(doc)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      @if (auth.hasRole('administrador') || auth.hasRole('coordinador')) {
                        <button class="btn btn-ghost btn-icon btn-sm" title="Eliminar" (click)="eliminar(doc)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

        <!-- Pagination -->
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
      h1 { font-size: 1.75rem; margin-bottom: 4px; color: var(--text-primary); }
      p { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
    }

    .filters-card {
      margin-bottom: 16px;
      padding: 20px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }

    .align-end { justify-content: flex-end; align-self: flex-end; }

    .doc-title { font-weight: 600; font-size: 0.925rem; color: var(--text-primary); }
    .doc-desc { margin-top: 3px; color: var(--text-secondary); font-size: 0.82rem; }

    .action-btns { display: flex; gap: 4px; }

    .file-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.pdf { background: #fee2e2; color: #b91c1c; }
      &.word { background: #dbeafe; color: #1d4ed8; }
      &.excel { background: #dcfce7; color: #15803d; }
      &.image { background: #fef9c3; color: #a16207; }
      &.zip { background: #f3e8ff; color: #7c3aed; }
      &.other { background: var(--border-light); color: var(--text-muted); }
    }
  `]
})
export class DocumentListComponent implements OnInit {
  documentos = signal<Documento[]>([]);
  loading = signal(true);
  total = signal(0);
  totalPaginas = signal(1);
  pagina = signal(1);
  factores = signal<Factor[]>([]);
  tipos = signal<TipoEvidencia[]>([]);
  anios: number[] = [];

  filtros: DocumentoFiltros = {};
  private debounceTimer: any;

  constructor(
    private docService: DocumentoService,
    private factorService: FactorService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    this.anios = Array.from({ length: 8 }, (_, i) => currentYear - i);

    this.factorService.listar().subscribe(data => this.factores.set(data));
    this.factorService.listarTiposEvidencia().subscribe(data => this.tipos.set(data));
    this.buscar();
  }

  buscarConDebounce() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.buscar(), 400);
  }

  buscar() {
    this.pagina.set(1);
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.docService.listar({ ...this.filtros, page: this.pagina(), limit: 15 }).subscribe({
      next: (res) => {
        this.documentos.set(res.data);
        this.total.set(res.total);
        this.totalPaginas.set(res.totalPaginas);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onFactorChange() {
    this.filtros.caracteristica_id = undefined;
    this.buscar();
  }

  limpiarFiltros() {
    this.filtros = {};
    this.buscar();
  }

  irPagina(p: number) {
    this.pagina.set(p);
    this.cargar();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  descargar(doc: Documento) {
    this.docService.descargar(doc.id, doc.nombre_original || 'archivo').subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre_original || 'archivo';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  eliminar(doc: Documento) {
    if (confirm(`¿Eliminar "${doc.titulo}"? Esta acción no se puede deshacer.`)) {
      this.docService.eliminar(doc.id).subscribe(() => this.cargar());
    }
  }

  getFileClass(mime?: string): string {
    if (!mime) return 'other';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('word') || mime.includes('doc')) return 'word';
    if (mime.includes('excel') || mime.includes('sheet')) return 'excel';
    if (mime.includes('image')) return 'image';
    if (mime.includes('zip')) return 'zip';
    return 'other';
  }

  getFileExt(filename?: string): string {
    if (!filename) return '???';
    return filename.split('.').pop()?.toUpperCase() ?? '???';
  }
}
