import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocumentoService, Documento } from '../../../core/services/documento.service';
import { FactorService, Factor, TipoEvidencia } from '../../../core/services/factor.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="back-bar">
      <a routerLink="/documentos" class="back-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver a documentos
      </a>
    </div>

    @if (loading()) {
      <div class="loading-overlay" style="padding:80px">
        <div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:36px;height:36px"></div>
        <span>Cargando documento...</span>
      </div>
    } @else if (documento()) {
      <div class="detail-layout">

        <!-- Left: Main info -->
        <div class="detail-main">
          <!-- Header card -->
          <div class="card doc-header-card">
            <div class="doc-header-top">
              <div class="doc-file-icon" [class]="getFileClass(documento()!.tipo_mime)">
                {{ getFileEmoji(documento()!.tipo_mime) }}
              </div>
              <div class="doc-meta">
                <h1>{{ documento()!.titulo }}</h1>
                <div class="meta-tags">
                  @if (documento()!.factor_codigo) {
                    <span class="badge badge-primary">{{ documento()!.factor_codigo }}</span>
                  }
                  @if (documento()!.tipo_evidencia) {
                    <span class="badge badge-accent">{{ documento()!.tipo_evidencia }}</span>
                  }
                  <span class="badge badge-neutral">{{ documento()!.anio }}{{ documento()!.semestre ? ' / ' + documento()!.semestre : '' }}</span>
                </div>
                @if (documento()!.descripcion) {
                  <p class="doc-description">{{ documento()!.descripcion }}</p>
                }
              </div>
            </div>

            <div class="doc-actions">
              <button class="btn btn-primary" (click)="descargar()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar
              </button>
              @if (puedeVisualizarEnNavegador()) {
                <button class="btn btn-outline" (click)="abrirVisualizacion()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Visualizar
                </button>
              }
              <button class="btn btn-ghost" (click)="mostrarFormEdicion.set(!mostrarFormEdicion())">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
              </button>
            </div>
          </div>

          <!-- Edit form -->
          @if (mostrarFormEdicion()) {
            <div class="card">
              <div class="card-header">
                <h3>Editar Metadatos</h3>
                <button class="btn btn-ghost btn-sm" (click)="mostrarFormEdicion.set(false)">✕</button>
              </div>
              <div class="card-body">
                @if (errorEdicion()) {
                  <div class="alert alert-danger" style="margin-bottom:16px">{{ errorEdicion() }}</div>
                }
                <div class="edit-grid">
                  <div class="form-group span-2">
                    <label>Título <span class="required">*</span></label>
                    <input type="text" class="form-control" [(ngModel)]="editForm.titulo" name="edit_titulo" />
                  </div>
                  <div class="form-group span-2">
                    <label>Descripción</label>
                    <textarea class="form-control" [(ngModel)]="editForm.descripcion" name="edit_desc" rows="2"></textarea>
                  </div>
                  <div class="form-group span-2">
                    <label>Factor</label>
                    <select class="form-control" [(ngModel)]="editForm.factor_id" name="edit_factor">
                      <option [ngValue]="null">Sin factor</option>
                      @for (f of factores(); track f.id) {
                        <option [ngValue]="f.id">{{ f.codigo }} - {{ f.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Tipo de Evidencia</label>
                    <select class="form-control" [(ngModel)]="editForm.tipo_evidencia_id" name="edit_tipo">
                      <option [ngValue]="null">Sin tipo</option>
                      @for (t of tipos(); track t.id) {
                        <option [ngValue]="t.id">{{ t.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Año</label>
                    <select class="form-control" [(ngModel)]="editForm.anio" name="edit_anio">
                      @for (a of anios; track a) {
                        <option [ngValue]="a">{{ a }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Semestre</label>
                    <select class="form-control" [(ngModel)]="editForm.semestre" name="edit_sem">
                      <option value="">Sin semestre</option>
                      <option value="A">Semestre A</option>
                      <option value="B">Semestre B</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                  <div class="form-group span-2">
                    <label>Responsable</label>
                    <input type="text" class="form-control" [(ngModel)]="editForm.responsable" name="edit_resp" />
                  </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
                  <button class="btn btn-outline" (click)="mostrarFormEdicion.set(false)">Cancelar</button>
                  <button class="btn btn-primary" (click)="guardarEdicion()" [disabled]="guardando()">
                    @if (guardando()) { <span class="spinner"></span> } Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Preview panel -->
          @if (mostrarPreview() && puedeVisualizarEnNavegador()) {
            <div class="card preview-card">
              <div class="card-header">
                <h3>Vista previa</h3>
                <button class="btn btn-ghost btn-sm" (click)="mostrarPreview.set(false)">✕ Cerrar</button>
              </div>
              <div class="preview-body">
                @if (documento()!.tipo_mime?.includes('image')) {
                  <img [src]="getVisualizarUrl()" alt="Vista previa" class="preview-img" (error)="onPreviewError()" />
                } @else if (documento()!.tipo_mime?.includes('pdf')) {
                  <iframe [src]="getVisualizarUrl()" class="preview-iframe" title="Vista previa PDF"></iframe>
                }
              </div>
            </div>
          }

          <!-- Details table -->
          <div class="card">
            <div class="card-header"><h3>Información de Clasificación</h3></div>
            <div class="card-body">
              <dl class="info-grid">
                <div class="info-item">
                  <dt>Factor</dt>
                  <dd>{{ documento()!.factor_nombre ?? '—' }}</dd>
                </div>
                <div class="info-item">
                  <dt>Tipo de evidencia</dt>
                  <dd>{{ documento()!.tipo_evidencia ?? '—' }}</dd>
                </div>
                <div class="info-item">
                  <dt>Año</dt>
                  <dd>{{ documento()!.anio }}</dd>
                </div>
                <div class="info-item">
                  <dt>Semestre</dt>
                  <dd>{{ documento()!.semestre ?? '—' }}</dd>
                </div>
                <div class="info-item">
                  <dt>Responsable</dt>
                  <dd>{{ documento()!.responsable ?? '—' }}</dd>
                </div>
                <div class="info-item">
                  <dt>Subido por</dt>
                  <dd>{{ documento()!.subido_por_nombre ?? '—' }}</dd>
                </div>
                <div class="info-item">
                  <dt>Fecha de carga</dt>
                  <dd>{{ formatDate(documento()!.created_at) }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <!-- Right: Versioning sidebar -->
        <div class="detail-sidebar">
          <div class="card">
            <div class="card-header">
              <h3>Historial de Versiones</h3>
              <span class="badge badge-neutral">{{ documento()!.versiones?.length ?? 0 }}</span>
            </div>
            <div class="versions-list">
              @for (v of documento()!.versiones ?? []; track v.id) {
                <div class="version-item" [class.current]="v.es_version_actual">
                  <div class="version-header">
                    <span class="version-number">v{{ v.version_numero }}</span>
                    @if (v.es_version_actual) {
                      <span class="badge badge-success">Actual</span>
                    }
                  </div>
                  <p class="version-filename">{{ v.nombre_original }}</p>
                  <p class="version-meta">
                    {{ formatSize(v.tamanio_bytes) }} · {{ formatDate(v.created_at) }}
                  </p>
                  @if (v.notas_version) {
                    <p class="version-notes">{{ v.notas_version }}</p>
                  }
                  <p class="version-author text-muted text-xs">Por: {{ v.subido_por_nombre }}</p>
                  <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" (click)="descargarVersion(v)">
                    ↓ Descargar esta versión
                  </button>
                </div>
              }
            </div>

            <!-- Upload new version -->
            <div class="new-version-area">
              <button class="btn btn-outline btn-sm" style="width:100%" (click)="mostrarNuevaVersion.set(!mostrarNuevaVersion())">
                + Subir nueva versión
              </button>

              @if (mostrarNuevaVersion()) {
                <div class="new-version-form">
                  <div
                    class="mini-upload"
                    [class.has-file]="nuevaVersionFile()"
                    (click)="versionInput.click()"
                    (dragover)="$event.preventDefault()"
                    (drop)="onVersionDrop($event)"
                  >
                    <input #versionInput type="file" hidden (change)="onVersionFileSelected($event)" />
                    @if (!nuevaVersionFile()) {
                      <span class="text-sm text-muted">Haz clic o arrastra el archivo aquí</span>
                    } @else {
                      <span class="text-sm fw-600">📎 {{ nuevaVersionFile()?.name }}</span>
                    }
                  </div>
                  <div class="form-group">
                    <label>Notas de la versión</label>
                    <input type="text" class="form-control" [(ngModel)]="nuevaVersionNotas" placeholder="¿Qué cambió?" />
                  </div>
                  @if (errorVersion()) {
                    <div class="alert alert-danger">{{ errorVersion() }}</div>
                  }
                  <button class="btn btn-primary btn-sm" style="width:100%" (click)="subirNuevaVersion()" [disabled]="subiendoVersion()">
                    @if (subiendoVersion()) { <span class="spinner"></span> } Subir versión
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Documento no encontrado</h3>
        <a routerLink="/documentos" class="btn btn-primary" style="margin-top:16px">Volver al listado</a>
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

    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
      align-items: start;

      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .detail-main { display: flex; flex-direction: column; gap: 16px; }
    .detail-sidebar { display: flex; flex-direction: column; gap: 16px; }

    .doc-header-card .card-body { padding: 24px; }
    .doc-header-top {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .doc-file-icon {
      font-size: 3rem;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      flex-shrink: 0;

      &.pdf { background: #fee2e2; }
      &.word { background: #dbeafe; }
      &.excel { background: #dcfce7; }
      &.image { background: #fef9c3; }
      &.zip { background: #f3e8ff; }
      &.other { background: var(--surface); }
    }

    .doc-meta h1 { font-size: 1.5rem; margin-bottom: 10px; }

    .meta-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .doc-description { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; }

    .doc-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-item {
      dt { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px; }
      dd { font-size: 0.9rem; color: var(--text-primary); }
    }

    .edit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      .span-2 { grid-column: span 2; }
      @media (max-width: 600px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
    }

    .versions-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }

    .version-item {
      padding: 12px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      background: var(--surface);
      transition: border-color 0.2s;

      &.current { border-color: var(--success); background: rgba(46,125,82,0.04); }
    }

    .version-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .version-number { font-weight: 700; font-size: 0.875rem; color: var(--primary); }
    .version-filename { font-size: 0.8rem; color: var(--text-primary); font-weight: 500; word-break: break-all; }
    .version-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
    .version-notes { font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px; font-style: italic; }
    .version-author { margin-top: 4px; }

    .new-version-area { padding: 12px; border-top: 1px solid var(--border-light); }
    .new-version-form { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }

    .mini-upload {
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { border-color: var(--primary-light); background: rgba(45,95,138,0.04); }
      &.has-file { border-color: var(--success); }
    }

    .preview-card { overflow: hidden; }
    .preview-body { background: #f8f8f8; }
    .preview-img { width: 100%; max-height: 500px; object-fit: contain; display: block; }
    .preview-iframe { width: 100%; height: 600px; border: none; display: block; }
  `]
})
export class DocumentDetailComponent implements OnInit {
  documento = signal<Documento | null>(null);
  loading = signal(true);
  mostrarFormEdicion = signal(false);
  mostrarPreview = signal(false);
  mostrarNuevaVersion = signal(false);
  guardando = signal(false);
  subiendoVersion = signal(false);
  errorEdicion = signal('');
  errorVersion = signal('');
  nuevaVersionFile = signal<File | null>(null);
  nuevaVersionNotas = '';
  factores = signal<Factor[]>([]);
  tipos = signal<TipoEvidencia[]>([]);
  anios: number[] = [];

  editForm: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docService: DocumentoService,
    private factorService: FactorService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    this.anios = Array.from({ length: 8 }, (_, i) => currentYear - i);
    this.factorService.listar().subscribe(f => this.factores.set(f));
    this.factorService.listarTiposEvidencia().subscribe(t => this.tipos.set(t));

    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargarDocumento(id);
  }

  cargarDocumento(id: string) {
    this.loading.set(true);
    this.docService.obtener(id).subscribe({
      next: (doc) => {
        this.documento.set(doc);
        this.editForm = {
          titulo: doc.titulo,
          descripcion: doc.descripcion ?? '',
          factor_id: doc.factor_id ?? null,
          tipo_evidencia_id: doc.tipo_evidencia_id ?? null,
          anio: doc.anio,
          semestre: doc.semestre ?? '',
          responsable: doc.responsable ?? '',
        };
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  guardarEdicion() {
    if (!this.editForm.titulo) { this.errorEdicion.set('El título es obligatorio'); return; }
    this.guardando.set(true);
    this.errorEdicion.set('');

    this.docService.actualizar(this.documento()!.id, this.editForm).subscribe({
      next: () => {
        this.mostrarFormEdicion.set(false);
        this.cargarDocumento(this.documento()!.id);
        this.guardando.set(false);
      },
      error: (err) => {
        this.errorEdicion.set(err.error?.message || 'Error al actualizar');
        this.guardando.set(false);
      }
    });
  }

  descargar() {
    const doc = this.documento()!;
    this.docService.descargar(doc.id, doc.nombre_original || 'archivo').subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre_original || 'archivo';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  descargarVersion(v: any) {
    const token = localStorage.getItem('sisacre_token');
    const url = `${environment.apiUrl}/documentos/${this.documento()!.id}/descargar?version_id=${v.id}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  }

  abrirVisualizacion() {
    this.mostrarPreview.set(true);
  }

  onPreviewError() {
    alert('No se pudo cargar la vista previa del archivo.');
  }

  getVisualizarUrl(): string {
    const token = localStorage.getItem('sisacre_token');
    return `${environment.apiUrl}/documentos/${this.documento()!.id}/visualizar`;
  }

  puedeVisualizarEnNavegador(): boolean {
    const mime = this.documento()?.tipo_mime ?? '';
    return mime.includes('image') || mime.includes('pdf');
  }

  onVersionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.nuevaVersionFile.set(input.files[0]);
  }

  onVersionDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.nuevaVersionFile.set(file);
  }

  subirNuevaVersion() {
    if (!this.nuevaVersionFile()) { this.errorVersion.set('Selecciona un archivo'); return; }
    this.subiendoVersion.set(true);
    this.errorVersion.set('');

    const fd = new FormData();
    fd.append('archivo', this.nuevaVersionFile()!);
    if (this.nuevaVersionNotas) fd.append('notas_version', this.nuevaVersionNotas);

    this.docService.nuevaVersion(this.documento()!.id, fd).subscribe({
      next: () => {
        this.mostrarNuevaVersion.set(false);
        this.nuevaVersionFile.set(null);
        this.nuevaVersionNotas = '';
        this.cargarDocumento(this.documento()!.id);
        this.subiendoVersion.set(false);
      },
      error: (err) => {
        this.errorVersion.set(err.error?.message || 'Error al subir versión');
        this.subiendoVersion.set(false);
      }
    });
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

  getFileEmoji(mime?: string): string {
    if (!mime) return '📎';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('word')) return '📝';
    if (mime.includes('excel') || mime.includes('sheet')) return '📊';
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('zip')) return '🗜️';
    if (mime.includes('presentation')) return '📑';
    return '📎';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
