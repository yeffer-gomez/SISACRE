import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EvidenciaDocente, DocenteService, OpcionesDocente } from '../../../../core/services/docente.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Pestaña de evidencias.
 *
 * Reutiliza la tabla `documentos` existente en vez de crear otra: cada
 * fila es un documento de Factor 3, y el vínculo con el docente se guarda
 * en `documentos.docente_id`. Al crear, el backend además genera la
 * `version_documento` inicial y la `evidencia` asociada.
 */
@Component({
  selector: 'app-docente-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="registro-header">
      <div>
        <h2>Evidencias</h2>
        <p class="text-muted">Documentos de soporte vinculados a este docente en los factores de acreditación.</p>
      </div>
      @if (puedeSubir()) {
        <button class="btn btn-primary btn-sm" (click)="mostrarForm.set(true)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adjuntar evidencia
        </button>
      }
    </div>

    @if (cargando()) {
      <div class="loading-overlay"><div class="spinner spinner-dark"></div></div>
    } @else if (documentos().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">📎</div>
        <h3>Sin evidencias</h3>
        <p>No hay documentos vinculados a este docente todavía.</p>
      </div>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Factor</th>
            <th>Origen</th>
            <th>Año</th>
            <th>Archivo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (d of documentos(); track d.id) {
            <tr>
              <td>
                <strong>{{ d.titulo }}</strong>
                @if (d.tipo_evidencia) { <div class="sub">{{ d.tipo_evidencia }}</div> }
              </td>
              <td>
                @if (d.factor_codigo) {
                  <span class="badge">{{ d.factor_codigo }}</span>
                } @else { <span class="text-muted">—</span> }
              </td>
              <td class="text-sm">{{ d.origen_etiqueta }}</td>
              <td>{{ d.anio }}</td>
              <td class="text-sm text-muted">{{ d.nombre_original || '—' }}</td>
              <td class="text-right">
                <a [routerLink]="['/documentos', d.id]" class="btn btn-ghost btn-sm">Ver</a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }

    @if (mostrarForm()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="modal-head">
            <h3>Adjuntar evidencia</h3>
            <button class="btn btn-ghost btn-icon btn-sm" (click)="mostrarForm.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (error()) { <div class="alert alert-danger" style="margin-bottom:16px">{{ error() }}</div> }
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Archivo <span class="required">*</span></label>
                <input type="file" class="form-control" (change)="elegirArchivo($event)" />
                <small class="text-muted">PDF, imagen o documento. Máximo 25 MB.</small>
              </div>
              <div class="form-group span-2">
                <label>Título <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="form.titulo" name="titulo"
                       placeholder="Ej. Certificado de vinculación 2026" />
              </div>
              <div class="form-group">
                <label>Factor</label>
                <select class="form-control" [ngModel]="form.factor_id" (ngModelChange)="onFactorChange($event)" name="factor_id">
                  <option [ngValue]="null">— Sin factor —</option>
                  @for (f of factores(); track f.id) { <option [ngValue]="f.id">{{ f.codigo }} · {{ f.nombre }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label>Característica</label>
                <select class="form-control" [(ngModel)]="form.caracteristica_id" name="caracteristica_id">
                  <option [ngValue]="null">— Sin característica —</option>
                  @for (c of caracteristicasVisibles(); track c.id) { <option [ngValue]="c.id">{{ c.codigo }} · {{ c.nombre }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label>Año <span class="required">*</span></label>
                <input type="number" min="1900" max="2200" class="form-control" [(ngModel)]="form.anio" name="anio" />
              </div>
              <div class="form-group">
                <label>Semestre</label>
                <select class="form-control" [(ngModel)]="form.semestre" name="semestre">
                  <option [ngValue]="null">— Sin especificar —</option>
                  @for (p of opciones.PERIODOS; track p) { <option [value]="p">{{ p }}</option> }
                </select>
              </div>
              <div class="form-group span-2">
                <label>Descripción</label>
                <textarea class="form-control" rows="2" [(ngModel)]="form.descripcion" name="descripcion"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="mostrarForm.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="subir()" [disabled]="subiendo()">
              @if (subiendo()) { <span class="spinner"></span> }
              Subir
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .registro-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; flex-wrap: wrap; margin-bottom: 18px;
      h2 { font-size: 1.25rem; margin-bottom: 4px; }
      p { font-size: 0.875rem; max-width: 70ch; }
    }
    .sub { font-size: 0.78rem; color: var(--text-muted); }
    .text-right { text-align: right; }
    .modal-head { padding: 20px 24px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; h3 { font-size: 1.1rem; } }
    .modal-body { padding: 24px; }
    .modal-foot { padding: 16px 24px; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; gap: 10px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .span-2 { grid-column: 1 / -1; }
    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 26px; height: 26px; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class DocenteDocumentosComponent implements OnInit {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) opciones!: OpcionesDocente;

  documentos = signal<EvidenciaDocente[]>([]);
  factores = signal<{ id: number; codigo: string; nombre: string }[]>([]);
  caracteristicas = signal<{ id: number; codigo: string; nombre: string; factor_id: number }[]>([]);

  /**
   * El factor vive en la signal para que `caracteristicasVisibles` reaccione
   * a su cambio: con un objeto plano el `computed` no se invalidaría al
   * elegir otro factor y la lista seguiría mostrando todas.
   */
  readonly factorElegido = signal<number | null>(null);

  /** Sin factor elegido se ofrecen todas: el usuario puede no saber a cuál corresponde. */
  readonly caracteristicasVisibles = computed(() => {
    const factorId = this.factorElegido();
    const todas = this.caracteristicas();
    return factorId ? todas.filter(c => c.factor_id === factorId) : todas;
  });

  cargando = signal(true);
  subiendo = signal(false);
  mostrarForm = signal(false);
  error = signal<string | null>(null);
  form: {
    titulo: string;
    anio: number | null;
    semestre: string | null;
    factor_id: number | null;
    caracteristica_id: number | null;
    descripcion: string;
  } = { titulo: '', anio: null, semestre: null, factor_id: null, caracteristica_id: null, descripcion: '' };
  private archivo: File | null = null;

  constructor(private docenteService: DocenteService, private auth: AuthService) {}

  /** El factor se refleja en su signal para filtrar las características. */
  onFactorChange(valor: number | null) {
    this.form.factor_id = valor;
    this.factorElegido.set(valor === null ? null : Number(valor));
    // La característica elegida pertenece al factor anterior: se limpia.
    this.form.caracteristica_id = null;
  }

  ngOnInit() {
    this.cargar();
    // Factores y características alimentan los <select> del modal.
    this.docenteService.opciones().subscribe(o => {
      this.factores.set(((o as any).FACTORES ?? []) as any);
      this.caracteristicas.set(((o as any).CARACTERISTICAS ?? []) as any);
    });
  }

  cargar() {
    this.cargando.set(true);
    this.docenteService.listarDocumentos(this.docenteId).subscribe({
      next: res => {
        this.documentos.set(res.data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  puedeSubir() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  elegirArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
  }

  subir() {
    this.error.set(null);
    if (!this.archivo) {
      this.error.set('Selecciona un archivo');
      return;
    }
    if (!this.form.titulo) {
      this.error.set('El título es obligatorio');
      return;
    }
    if (!this.form.anio) {
      this.error.set('El año es obligatorio');
      return;
    }

    const fd = new FormData();
    fd.append('archivo', this.archivo);
    fd.append('titulo', this.form.titulo);
    fd.append('anio', String(this.form.anio));
    // Sin `origen` la evidencia queda como documento general del docente,
    // vinculada por documentos.docente_id.
    if (this.form.factor_id) fd.append('factor_id', String(this.form.factor_id));
    if (this.form.caracteristica_id) fd.append('caracteristica_id', String(this.form.caracteristica_id));
    if (this.form.semestre) fd.append('semestre', this.form.semestre);
    if (this.form.descripcion) fd.append('descripcion', this.form.descripcion);

    this.subiendo.set(true);
    this.docenteService.crearDocumento(this.docenteId, fd).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.mostrarForm.set(false);
        this.archivo = null;
        this.form = { titulo: '', anio: null, semestre: null, factor_id: null, caracteristica_id: null, descripcion: '' };
        this.factorElegido.set(null);
        this.cargar();
      },
      error: err => {
        this.subiendo.set(false);
        this.error.set(err.error?.message || 'No se pudo subir el documento');
      }
    });
  }

  cerrarModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.mostrarForm.set(false);
  }
}
