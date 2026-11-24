import { Component, OnInit, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ProyectoService, Proyecto } from '../../../core/services/proyecto.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="/proyectos" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Volver a proyectos
      </a>
      <h1>{{ editando() ? 'Editar Proyecto' : 'Crear Proyecto' }}</h1>
    </div>

    <div class="form-layout">
      <form (ngSubmit)="onSubmit()" class="card">
        <div class="card-header">
          <h3>Datos del Proyecto de Investigación</h3>
          <span class="text-muted text-sm">Campos con <span style="color:var(--danger)">*</span> son obligatorios</span>
        </div>
        <div class="card-body">

          @if (error()) {
            <div class="alert alert-danger" style="margin-bottom:20px">{{ error() }}</div>
          }
          @if (exito()) {
            <div class="alert alert-success" style="margin-bottom:20px">{{ exito() }}</div>
          }

          <!-- Sección 1: Identificación -->
          <div class="section-title">Identificación</div>
          <div class="form-grid">
            <div class="form-group span-2">
              <label>Nombre del Proyecto <span class="required">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="form.nombre" name="nombre"
                placeholder="Título completo del proyecto" required />
            </div>

            <div class="form-group">
              <label>Código del Proyecto</label>
              <input type="text" class="form-control" [(ngModel)]="form.codigo_proyecto" name="codigo_proyecto"
                placeholder="Ej: PSI-2024-001" />
            </div>

            <div class="form-group">
              <label>Fecha de Inicio</label>
              <input type="date" class="form-control" [(ngModel)]="form.fecha_inicio" name="fecha_inicio" />
            </div>

            <div class="form-group">
              <label>Año de Publicación <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="form.anio_publicacion" name="anio_publicacion" required>
                <option [ngValue]="null">Selecciona un año</option>
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
              </select>
            </div>

            <div class="form-group">
              <label>Duración</label>
              <input type="text" class="form-control" [(ngModel)]="form.duracion" name="duracion"
                placeholder="Ej: 12 meses, 2 años" />
            </div>
          </div>

          <!-- Sección 2: Clasificación -->
          <div class="section-title">Clasificación</div>
          <div class="form-grid">
            <div class="form-group">
              <label>Tipo de Producto</label>
              <select class="form-control" [(ngModel)]="form.tipo_producto" name="tipo_producto">
                <option value="">Selecciona</option>
                @for (t of tiposProducto; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Tipo de Proyecto</label>
              <select class="form-control" [(ngModel)]="form.tipo_proyecto" name="tipo_proyecto">
                <option value="">Selecciona</option>
                @for (t of tiposProyecto; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>

            <div class="form-group span-2">
              <label>Objeto Socioeconómico</label>
              <select class="form-control" [(ngModel)]="form.objeto_socioeconomico" name="objeto_socioeconomico">
                <option value="">Selecciona</option>
                @for (o of objetosSocioeconomicos; track o) {
                  <option [value]="o">{{ o }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Producto financiado por la VIIS</label>
              <div class="radio-group">
                <label class="radio-option" [class.selected]="form.financiado_viis === 'Si'">
                  <input type="radio" [(ngModel)]="form.financiado_viis" name="financiado_viis" value="Si" />
                  <span class="radio-dot"></span>
                  Sí
                </label>
                <label class="radio-option" [class.selected]="form.financiado_viis === 'No'">
                  <input type="radio" [(ngModel)]="form.financiado_viis" name="financiado_viis" value="No" />
                  <span class="radio-dot"></span>
                  No
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Link / ISSN</label>
              <input type="text" class="form-control" [(ngModel)]="form.link_iisn" name="link_iisn"
                placeholder="URL o código ISSN" />
            </div>
          </div>

          <!-- Sección 3: Contenido -->
          <div class="section-title">Contenido</div>
          <div class="form-grid">
            <div class="form-group span-2">
              <label>Objetivo</label>
              <textarea class="form-control" [(ngModel)]="form.objetivo" name="objetivo"
                rows="3" placeholder="Objetivo general del proyecto..."></textarea>
            </div>

            <div class="form-group span-2">
              <label>Resumen</label>
              <textarea class="form-control" [(ngModel)]="form.resumen" name="resumen"
                rows="4" placeholder="Resumen del proyecto..."></textarea>
            </div>

            <div class="form-group span-2">
              <label>Resultado del Proyecto</label>
              <textarea class="form-control" [(ngModel)]="form.resultado_proyecto" name="resultado_proyecto"
                rows="3" placeholder="Principales resultados obtenidos..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/proyectos" class="btn btn-outline">Cancelar</a>
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ editando() ? 'Guardar cambios' : 'Guardar Proyecto' }}
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

    .form-layout { max-width: 820px; }

    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary);
      padding: 10px 0 12px;
      border-bottom: 2px solid var(--border-light);
      margin-bottom: 18px;
    }

    .section-title + .section-title { margin-top: -8px; }

    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px;
      .span-2 { grid-column: span 2; }
      @media (max-width: 640px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
    }

    textarea.form-control { resize: vertical; }

    /* Radio buttons */
    .radio-group {
      display: flex; gap: 12px; margin-top: 4px;
    }

    .radio-option {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--text-secondary);
      transition: all 0.2s;
      flex: 1; justify-content: center;

      input[type="radio"] { display: none; }

      .radio-dot {
        width: 16px; height: 16px;
        border: 2px solid var(--border);
        border-radius: 50%;
        flex-shrink: 0;
        transition: all 0.2s;
        position: relative;

        &::after {
          content: '';
          width: 8px; height: 8px;
          background: var(--primary);
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.15s;
        }
      }

      &.selected {
        border-color: var(--primary);
        background: rgba(79,70,229,0.08);
        color: var(--primary);

        .radio-dot {
          border-color: var(--primary);
          &::after { transform: translate(-50%, -50%) scale(1); }
        }
      }

      &:hover:not(.selected) {
        border-color: var(--primary-light);
        background: rgba(79,70,229,0.04);
      }
    }

    .form-actions {
      display: flex; gap: 12px; justify-content: flex-end;
      border-top: 1px solid var(--border-light); padding-top: 20px;
    }
  `]
})
export class ProjectFormComponent implements OnInit {
  editando = signal(false);
  loading = signal(false);
  error = signal('');
  exito = signal('');
  anios: number[] = [];
  tiposProducto: string[] = [];
  tiposProyecto: string[] = [];
  objetosSocioeconomicos: string[] = [];

  form: Partial<Proyecto> = {
    nombre: '',
    anio_publicacion: new Date().getFullYear(),
    semestre: '',
    duracion: '',
    tipo_producto: '',
    objetivo: '',
    resumen: '',
    resultado_proyecto: '',
    fecha_inicio: '',
    tipo_proyecto: '',
    objeto_socioeconomico: '',
    link_iisn: '',
    financiado_viis: '',
    codigo_proyecto: '',
  };

  private proyectoId: string | null = null;

  constructor(
    private proyectoService: ProyectoService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const y = new Date().getFullYear();
    this.anios = Array.from({ length: 12 }, (_, i) => y - i);

    this.proyectoService.opciones().subscribe(op => {
      this.tiposProducto = op.TIPOS_PRODUCTO;
      this.tiposProyecto = op.TIPOS_PROYECTO;
      this.objetosSocioeconomicos = op.OBJETOS_SOCIOECONOMICOS;
    });

    this.proyectoId = this.route.snapshot.paramMap.get('id');
    if (this.proyectoId) {
      this.editando.set(true);
      this.proyectoService.obtener(this.proyectoId).subscribe({
        next: (p) => {
          this.form = {
            nombre: p.nombre,
            anio_publicacion: p.anio_publicacion,
            semestre: p.semestre ?? '',
            duracion: p.duracion ?? '',
            tipo_producto: p.tipo_producto ?? '',
            objetivo: p.objetivo ?? '',
            resumen: p.resumen ?? '',
            resultado_proyecto: p.resultado_proyecto ?? '',
            fecha_inicio: p.fecha_inicio ? p.fecha_inicio.substring(0, 10) : '',
            tipo_proyecto: p.tipo_proyecto ?? '',
            objeto_socioeconomico: p.objeto_socioeconomico ?? '',
            link_iisn: p.link_iisn ?? '',
            financiado_viis: p.financiado_viis ?? '',
            codigo_proyecto: p.codigo_proyecto ?? '',
          };
        },
        error: () => this.error.set('No se pudo cargar el proyecto')
      });
    }
  }

  onSubmit() {
    if (!this.form.nombre) { this.error.set('El nombre del proyecto es obligatorio'); return; }
    if (!this.form.anio_publicacion) { this.error.set('El año de publicación es obligatorio'); return; }

    this.loading.set(true);
    this.error.set('');

    // Limpiar campos vacíos
    const payload: any = {};
    Object.entries(this.form).forEach(([k, v]) => {
      payload[k] = v === '' ? null : v;
    });

    const obs = this.editando()
      ? this.proyectoService.actualizar(this.proyectoId!, payload)
      : this.proyectoService.crear(payload);

    obs.subscribe({
      next: (res: any) => {
        this.exito.set(this.editando() ? 'Proyecto actualizado exitosamente' : 'Proyecto creado exitosamente');
        const id = this.editando() ? this.proyectoId! : res.id;
        setTimeout(() => this.router.navigate(['/proyectos', id]), 1200);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Error al guardar el proyecto');
        this.loading.set(false);
      }
    });
  }
}
