import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentoService } from '../../../core/services/documento.service';
import { FactorService, Factor, TipoEvidencia } from '../../../core/services/factor.service';

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="/documentos" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver a documentos
      </a>
      <h1>Cargar Documento</h1>
    </div>

    <div class="form-layout">
      <form (ngSubmit)="onSubmit()" class="card">
        <div class="card-header">
          <h3>Información del Documento</h3>
          <span class="text-muted text-sm">Campos con <span style="color:var(--danger)">*</span> son obligatorios</span>
        </div>
        <div class="card-body">
          @if (error()) {
            <div class="alert alert-danger" style="margin-bottom:20px">{{ error() }}</div>
          }
          @if (exito()) {
            <div class="alert alert-success" style="margin-bottom:20px">{{ exito() }}</div>
          }

          <div
            class="upload-area"
            [class.has-file]="selectedFile()"
            [class.drag-over]="isDragging()"
            (click)="fileInput.click()"
            (dragover)="$event.preventDefault(); isDragging.set(true)"
            (dragleave)="isDragging.set(false)"
            (drop)="onDrop($event)"
          >
            <input #fileInput type="file" hidden (change)="onFileSelected($event)"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.ppt,.pptx" />
            @if (!selectedFile()) {
              <div class="upload-placeholder">
                <div class="upload-icon">📁</div>
                <p class="fw-600">Arrastra un archivo aquí o haz clic para seleccionar</p>
                <p class="text-muted text-sm">PDF, Word, Excel, PowerPoint, Imágenes, ZIP — Máx. 50MB</p>
              </div>
            } @else {
              <div class="file-selected">
                <div class="file-icon-big">{{ getFileEmoji(selectedFile()?.type) }}</div>
                <div>
                  <p class="fw-600">{{ selectedFile()?.name }}</p>
                  <p class="text-muted text-sm">{{ formatSize(selectedFile()?.size) }}</p>
                </div>
                <button type="button" class="btn btn-ghost btn-sm"
                  (click)="$event.stopPropagation(); selectedFile.set(null)">✕</button>
              </div>
            }
          </div>

          <div class="form-grid">
            <div class="form-group span-2">
              <label>Título <span class="required">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="form.titulo" name="titulo"
                placeholder="Nombre descriptivo del documento" required />
            </div>
            <div class="form-group span-2">
              <label>Descripción</label>
              <textarea class="form-control" [(ngModel)]="form.descripcion" name="descripcion"
                rows="2" placeholder="Breve descripción del contenido..."></textarea>
            </div>
            <div class="form-group span-2">
              <label>Factor <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.factor_id" name="factor_id">
                <option [ngValue]="null">Selecciona un factor</option>
                @for (f of factores(); track f.id) {
                  <option [ngValue]="f.id">{{ f.codigo }} - {{ f.nombre }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Tipo de Evidencia</label>
              <select class="form-control" [(ngModel)]="form.tipo_evidencia_id" name="tipo_evidencia_id">
                <option [ngValue]="null">Selecciona un tipo</option>
                @for (t of tipos(); track t.id) {
                  <option [ngValue]="t.id">{{ t.nombre }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Año <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.anio" name="anio" required>
                @for (a of anios; track a) {
                  <option [ngValue]="a">{{ a }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Semestre</label>
              <select class="form-control" [(ngModel)]="form.semestre" name="semestre">
                <option value="">Selecciona</option>
                <option value="A">Semestre A</option>
                <option value="B">Semestre B</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
            <div class="form-group">
              <label>Responsable</label>
              <input type="text" class="form-control" [(ngModel)]="form.responsable" name="responsable"
                placeholder="Nombre del responsable" />
            </div>
            <div class="form-group span-2">
              <label>Notas de esta versión</label>
              <input type="text" class="form-control" [(ngModel)]="form.notas_version" name="notas_version"
                placeholder="Ej: Versión inicial, actualización 2025-A..." />
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/documentos" class="btn btn-outline">Cancelar</a>
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Cargando...
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Cargar Documento
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; h1 { font-size: 1.75rem; margin-top: 10px; } }

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

    .form-layout { max-width: 760px; }

    .upload-area {
      border: 2px dashed var(--border); border-radius: var(--radius-lg);
      padding: 32px; text-align: center; cursor: pointer;
      transition: all 0.2s; margin-bottom: 24px;
      &:hover, &.drag-over { border-color: var(--primary-light); background: rgba(79,70,229,0.04); }
      &.has-file { border-style: solid; border-color: var(--success); background: rgba(46,125,82,0.04); }
    }

    .upload-placeholder p { margin-top: 10px; }
    .upload-icon { font-size: 2.5rem; margin-bottom: 8px; }
    .file-selected { display: flex; align-items: center; gap: 16px; justify-content: center; }
    .file-icon-big { font-size: 2rem; }

    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px;
      .span-2 { grid-column: span 2; }
      @media (max-width: 600px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
    }

    textarea.form-control { resize: vertical; }

    .form-actions {
      display: flex; gap: 12px; justify-content: flex-end;
      border-top: 1px solid var(--border-light); padding-top: 20px;
    }
  `]
})
export class DocumentFormComponent implements OnInit {
  factores = signal<Factor[]>([]);
  tipos = signal<TipoEvidencia[]>([]);
  selectedFile = signal<File | null>(null);
  loading = signal(false);
  error = signal('');
  exito = signal('');
  isDragging = signal(false);
  anios: number[] = [];

  form = {
    titulo: '', descripcion: '',
    factor_id: null as number | null,
    tipo_evidencia_id: null as number | null,
    anio: new Date().getFullYear(),
    semestre: '', responsable: '', notas_version: '',
  };

  constructor(private docService: DocumentoService, private factorService: FactorService, private router: Router) {}

  ngOnInit() {
    const y = new Date().getFullYear();
    this.anios = Array.from({ length: 8 }, (_, i) => y - i);
    this.factorService.listar().subscribe(d => this.factores.set(d));
    this.factorService.listarTiposEvidencia().subscribe(d => this.tipos.set(d));
  }

  onFileSelected(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.selectedFile.set(f);
  }

  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragging.set(false);
    const f = e.dataTransfer?.files[0];
    if (f) this.selectedFile.set(f);
  }

  onSubmit() {
    if (!this.form.titulo) { this.error.set('El título es obligatorio'); return; }
    if (!this.selectedFile()) { this.error.set('Debes seleccionar un archivo'); return; }
    this.loading.set(true); this.error.set('');
    const fd = new FormData();
    fd.append('archivo', this.selectedFile()!);
    Object.entries(this.form).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, String(v)); });
    this.docService.crear(fd).subscribe({
      next: (res) => { this.exito.set('Documento cargado exitosamente'); setTimeout(() => this.router.navigate(['/documentos', res.id]), 1200); },
      error: (err) => { this.error.set(err.error?.message || 'Error al cargar el documento'); this.loading.set(false); }
    });
  }

  getFileEmoji(mime?: string): string {
    if (!mime) return '📎';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('word')) return '📝';
    if (mime.includes('excel') || mime.includes('sheet')) return '📊';
    if (mime.includes('image')) return '🖼️';
    if (mime.includes('zip')) return '🗜️';
    return '📎';
  }

  formatSize(b?: number): string {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(2)} MB`;
  }
}
