import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DocenteService, DominioDocente, EsquemaCampo, EsquemaDominio, Esquemas,
  OpcionesDocente, RegistroDocente
} from '../../../../core/services/docente.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Renderiza una pestaña de historial del perfil del docente a partir del
 * esquema que entrega el backend (`GET /api/docentes/esquemas`).
 *
 * Los seis dominios —vinculaciones, formaciones, escalafones, evaluaciones,
 * planes de mejoramiento y redes— comparten exactamente el mismo
 * comportamiento: listar, crear, editar y eliminar lógicamente. Centralizarlo
 * aquí evita seis copias del mismo formulario, tabla y modal, y mantiene el
 * estilo visual de SISACRE.
 */
@Component({
  selector: 'app-docente-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="registro-header">
      <div>
        <h2>{{ esquema()?.titulo || 'Registros' }}</h2>
        @if (esquema()?.descripcion) {
          <p class="text-muted">{{ esquema()?.descripcion }}</p>
        }
      </div>
      @if (puedeEditar()) {
        <button class="btn btn-primary btn-sm" (click)="abrirNuevo()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo registro
        </button>
      }
    </div>

    @if (cargando()) {
      <div class="loading-overlay">
        <div class="spinner spinner-dark"></div>
        <span>Cargando...</span>
      </div>
    } @else if (registros().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Sin registros</h3>
        <p>{{ esquema()?.titulo || 'Todavía no hay información registrada en esta sección' }}</p>
        @if (puedeEditar()) {
          <button class="btn btn-primary" style="margin-top:16px" (click)="abrirNuevo()">
            Registrar el primero
          </button>
        }
      </div>
    } @else {
      <div class="registros-grid">
        @for (r of registros(); track r.id) {
          <div class="registro-card">
            <div class="registro-card-head">
              <div class="registro-titulo">
                <span class="registro-badge">{{ etiquetaPrincipal(r) }}</span>
                <span class="registro-sub">{{ etiquetaSecundaria(r) }}</span>
              </div>
              <div class="registro-acciones">
                @if (r.evidencia_id) {
                  <a [routerLink]="['/documentos', r.evidencia_id]"
                     class="badge badge-info" title="Ver evidencia asociada">Evidencia</a>
                }
                @if (puedeEditar()) {
                  <button class="btn btn-ghost btn-icon btn-sm" title="Editar" (click)="abrirEditar(r)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="btn btn-ghost btn-icon btn-sm btn-danger-icon" title="Eliminar" (click)="eliminar(r)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                }
              </div>
            </div>

            <dl class="registro-datos">
              @for (d of datosVisibles(r); track d.nombre) {
                <div class="dato">
                  <dt>{{ d.etiqueta }}</dt>
                  <dd>{{ d.valor }}</dd>
                </div>
              }
            </dl>

            @if (r.observaciones) {
              <p class="registro-obs"><strong>Observaciones:</strong> {{ r.observaciones }}</p>
            }
          </div>
        }
      </div>
    }

    <!-- Modal de alta / edición -->
    @if (mostrarForm()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="modal-head">
            <h3>{{ editando() ? 'Editar' : 'Nuevo registro' }} — {{ esquema()?.titulo }}</h3>
            <button class="btn btn-ghost btn-icon btn-sm" (click)="mostrarForm.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (errorForm()) {
              <div class="alert alert-danger" style="margin-bottom:16px">{{ errorForm() }}</div>
            }
            <div class="form-grid">
              @for (campo of campos(); track campo.nombre) {
                <div class="form-group" [class.span-2]="campo.ancho === 'completo'">
                  <label>
                    {{ campo.etiqueta }}
                    @if (campo.obligatorio) { <span class="required">*</span> }
                  </label>

                  @switch (campo.tipo) {
                    @case ('textarea') {
                      <textarea class="form-control" rows="3"
                        [(ngModel)]="form[campo.nombre]"
                        [name]="campo.nombre"></textarea>
                    }
                    @case ('select') {
                      <select class="form-control" [(ngModel)]="form[campo.nombre]" [name]="campo.nombre">
                        <option [ngValue]="null">— Sin especificar —</option>
                        @for (op of opcionesDe(campo); track op.valor) {
                          <option [ngValue]="op.valor">{{ op.etiqueta }}</option>
                        }
                      </select>
                    }
                    @case ('fecha') {
                      <input type="date" class="form-control" [(ngModel)]="form[campo.nombre]" [name]="campo.nombre" />
                    }
                    @case ('anio') {
                      <input type="number" min="1900" max="2200" class="form-control"
                        [(ngModel)]="form[campo.nombre]" [name]="campo.nombre" />
                    }
                    @case ('numero') {
                      <input type="number" step="0.01" class="form-control"
                        [(ngModel)]="form[campo.nombre]" [name]="campo.nombre" />
                    }
                    @case ('horas') {
                      <input type="number" step="0.5" min="0" class="form-control"
                        [(ngModel)]="form[campo.nombre]" [name]="campo.nombre" />
                    }
                    @default {
                      <input type="text" class="form-control" [(ngModel)]="form[campo.nombre]" [name]="campo.nombre" />
                    }
                  }
                </div>
              }
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="mostrarForm.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()" [disabled]="guardando()">
              @if (guardando()) { <span class="spinner"></span> }
              {{ editando() ? 'Guardar cambios' : 'Crear registro' }}
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

    .registros-grid { display: flex; flex-direction: column; gap: 12px; }

    .registro-card {
      border: 1px solid var(--border-light); border-radius: var(--radius);
      padding: 16px; background: var(--surface-card); transition: border-color 0.2s, box-shadow 0.2s;
      &:hover { border-color: var(--border); box-shadow: var(--shadow-sm); }
    }

    .registro-card-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    }

    .registro-titulo { display: flex; flex-direction: column; gap: 4px; }

    .registro-badge {
      font-weight: 600; font-size: 0.95rem; color: var(--text-primary);
    }

    .registro-sub { font-size: 0.82rem; color: var(--text-muted); }

    .registro-acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .btn-danger-icon:hover:not(:disabled) { color: var(--danger); background: rgba(185,28,28,0.08); }

    .registro-datos {
      margin-top: 12px; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 20px;
      dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; }
      dd { font-size: 0.9rem; color: var(--text-primary); font-weight: 500; margin-top: 2px; }
    }

    .registro-obs {
      margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border-light);
      font-size: 0.85rem; color: var(--text-secondary);
    }

    .modal-head {
      padding: 20px 24px; border-bottom: 1px solid var(--border-light);
      display: flex; justify-content: space-between; align-items: center;
      h3 { font-size: 1.1rem; }
    }
    .modal-body { padding: 24px; }
    .modal-foot {
      padding: 16px 24px; border-top: 1px solid var(--border-light);
      display: flex; justify-content: flex-end; gap: 10px;
    }

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .span-2 { grid-column: 1 / -1; }

    .spinner-dark {
      border-color: var(--primary); border-top-color: transparent;
      width: 26px; height: 26px;
    }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DocenteRegistroComponent implements OnInit {
  /** Id del docente dueño de los registros. */
  @Input({ required: true }) docenteId!: string;
  /** Dominio a renderizar: 'vinculaciones', 'evaluaciones', etc. */
  @Input({ required: true }) dominio!: DominioDocente;
  /** Esquemas de todos los dominios, resueltos una sola vez por el perfil. */
  @Input({ required: true }) esquemas!: Esquemas;
  /** Catálogos para los <select>. */
  @Input({ required: true }) opciones!: OpcionesDocente;

  /**
   * Emite los registros ya cargados para que la pestaña que lo contiene
   * pueda calcular sus propios indicadores (promedios, horas, conteos)
   * sin duplicar la llamada al backend.
   */
  @Output() registrosCargados = new EventEmitter<RegistroDocente[]>();

  registros = signal<RegistroDocente[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  editando = signal<string | null>(null);
  errorForm = signal<string | null>(null);
  form: Record<string, any> = {};

  esquema = computed(() => this.esquemas?.[this.dominio]);
  campos = computed(() => this.esquema()?.campos ?? []);
  puedeEditar = computed(() => this.auth.hasRole('administrador') || this.auth.hasRole('coordinador'));

  // Columnas excluidas de la vista resumida: son identificadores o
  // textos largos que ya se muestran en el encabezado u otras pestañas.
  private readonly ocultas = new Set([
    'id', 'docente_id', 'activo', 'created_at', 'updated_at', 'observaciones',
    'registrado_por', 'documento_id', 'plan_id', 'proyecto_id', 'red_id',
    'evidencia_titulo', 'evidencia_id', 'proyecto_nombre', 'codigo_proyecto',
    'tipo_proyecto', 'anio_publicacion', 'plan_nombre', 'red_nombre',
    'tipo_alcance', 'sitio_web'
  ]);

  constructor(private docenteService: DocenteService, private auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.docenteService.listarRegistros(this.docenteId, this.dominio).subscribe({
      next: res => {
        this.registros.set(res.data);
        this.registrosCargados.emit(res.data);
        this.cargando.set(false);
      },
      error: () => {
        this.registros.set([]);
        this.registrosCargados.emit([]);
        this.cargando.set(false);
      }
    });
  }

  // ── Presentación ───────────────────────────────────────────

  etiquetaPrincipal(r: RegistroDocente): string {
    switch (this.dominio) {
      case 'vinculaciones': return `${r.anio_vinculacion ?? ''} — ${r.tipo_vinculacion ?? ''}`.trim();
      case 'formaciones': return `${r.nivel_formacion ?? ''} — ${r.titulo ?? ''}`.trim();
      case 'escalafones': return `${r.nivel ?? ''}${r.categoria ? ' · Categoría ' + r.categoria : ''}`;
      case 'evaluaciones': return `${r.anio ?? ''} — ${r.tipo_evaluacion ?? ''}`.trim();
      case 'mejoramientos': return `${r.anio ?? ''} — ${r.plan ?? ''}`.trim();
      case 'redes': return r.red_nombre ?? 'Red académica';
      default: return 'Registro';
    }
  }

  etiquetaSecundaria(r: RegistroDocente): string {
    switch (this.dominio) {
      case 'vinculaciones':
        return [r.dedicacion, r.tiempo_vinculacion, r.acto_vinculacion].filter(Boolean).join(' · ') || 'Sin detalles';
      case 'formaciones':
        return [r.institucion, r.programa, r.anio_graduacion].filter(Boolean).join(' · ') || 'Sin institución registrada';
      case 'escalafones':
        return [r.fecha, r.decreto_1279, r.acto_ascenso].filter(Boolean).join(' · ') || '';
      case 'evaluaciones':
        return [r.periodo, r.escala ? 'Escala ' + r.escala : '', r.resultado != null ? 'Resultado ' + r.resultado : '']
          .filter(Boolean).join(' · ') || 'Sin resultado registrado';
      case 'mejoramientos':
        return [r.estado, r.periodo, r.responsable].filter(Boolean).join(' · ') || '';
      case 'redes':
        return [r.tipo_alcance, r.tipo_participacion, r.enlace_referencia].filter(Boolean).join(' · ') || '';
      default: return '';
    }
  }

  /** Datos de la tarjeta, derivados del esquema para no duplicar la lista de campos. */
  datosVisibles(r: RegistroDocente): { nombre: string; etiqueta: string; valor: string }[] {
    const salida: { nombre: string; etiqueta: string; valor: string }[] = [];
    for (const campo of this.campos()) {
      if (this.ocultas.has(campo.nombre)) continue;
      if (['textarea', 'select'].includes(campo.tipo)) continue;
      if (campo.nombre === 'anio_vinculacion' || campo.nombre === 'anio_graduacion'
        || campo.nombre === 'nivel' || campo.nombre === 'plan'
        || campo.nombre === 'titulo') continue;
      const valor = this.formatear(r[campo.nombre]);
      if (valor) salida.push({ nombre: campo.nombre, etiqueta: campo.etiqueta, valor });
    }
    return salida;
  }

  private formatear(v: any): string {
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  }

  /**
   * Opciones de un <select>. Solo lee: las dinámicas se cargan por
   * adelantado en `cargarDinamicas`, nunca desde el template, para no
   * abrir una suscripción en cada ciclo de detección de cambios.
   */
  opcionesDe(campo: EsquemaCampo): { valor: any; etiqueta: string }[] {
    if (campo.opciones) {
      const lista = (this.opciones as any)[campo.opciones] ?? [];
      return lista.map((v: string) => ({ valor: v, etiqueta: v }));
    }
    return this.dinamicas[campo.nombre] ?? [];
  }

  private dinamicas: Record<string, { valor: any; etiqueta: string }[]> = {};

  // ── Alta / edición ─────────────────────────────────────────

  abrirNuevo() {
    this.editando.set(null);
    this.errorForm.set(null);
    this.form = {};
    for (const campo of this.campos()) {
      if (campo.valorPorDefecto !== undefined) this.form[campo.nombre] = campo.valorPorDefecto;
      else if (campo.tipo === 'select') this.form[campo.nombre] = null;
      else this.form[campo.nombre] = '';
      this.cargarDinamicas(campo);
    }
    this.mostrarForm.set(true);
  }

  abrirEditar(r: RegistroDocente) {
    this.editando.set(r.id);
    this.errorForm.set(null);
    this.form = {};
    for (const campo of this.campos()) {
      this.form[campo.nombre] = r[campo.nombre] ?? (campo.tipo === 'select' ? null : '');
      this.cargarDinamicas(campo);
    }
    this.mostrarForm.set(true);
  }

  private cargarDinamicas(campo: EsquemaCampo) {
    if (!campo.opcionesEndpoint) return;
    this.docenteService.opcionesDinamicas(campo, this.docenteId).subscribe(
      opciones => (this.dinamicas[campo.nombre] = opciones.map(o => ({ valor: o.id, etiqueta: o.etiqueta })))
    );
  }

  guardar() {
    const esNuevo = this.editando() === null;
    this.errorForm.set(null);
    this.guardando.set(true);

    const payload: Record<string, any> = {};
    for (const campo of this.campos()) {
      const v = this.form[campo.nombre];
      payload[campo.nombre] = v === '' ? null : v;
    }

    const peticion = esNuevo
      ? this.docenteService.crearRegistro(this.docenteId, this.dominio, payload)
      : this.docenteService.actualizarRegistro(this.docenteId, this.dominio, this.editando()!, payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorForm.set(err.error?.message || 'No se pudo guardar el registro');
      }
    });
  }

  eliminar(r: RegistroDocente) {
    const etiqueta = this.esquema()?.etiqueta || 'registro';
    if (!confirm(`¿Eliminar el ${etiqueta} de "${this.etiquetaPrincipal(r)}"?\n\nLa eliminación es lógica: el registro dejará de mostrarse, pero el histórico no se borra de la base de datos.`)) {
      return;
    }
    this.docenteService.eliminarRegistro(this.docenteId, this.dominio, r.id).subscribe({
      next: () => this.cargar(),
      error: err => alert(err.error?.message || 'No se pudo eliminar el registro')
    });
  }

  cerrarModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.mostrarForm.set(false);
    }
  }
}
