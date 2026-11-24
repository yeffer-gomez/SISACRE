import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocenteService, FormDocente, OpcionesDocente, VinculacionInicial } from '../../../core/services/docente.service';

@Component({
  selector: 'app-docente-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="breadcrumbs">
      <a routerLink="/docentes">Docentes</a>
      <span>/</span>
      <span>{{ editando() ? 'Editar' : 'Nuevo' }}</span>
    </nav>

    <header class="page-head">
      <h1>{{ editando() ? 'Editar docente' : 'Registrar docente' }}</h1>
      <p class="text-muted">
        {{ editando()
          ? 'Modifica los datos generales. Los cambios en vinculación, formación y demás historiales se registran en su pestaña correspondente para no perder la trazabilidad.'
          : 'Crea la ficha del docente. La vinculación inicial queda guardada como primer registro del histórico.' }}
      </p>
    </header>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    <form (ngSubmit)="guardar()" class="form">
      <section class="card">
        <h2>Datos personales</h2>
        <div class="grid">
          <div class="form-group">
            <label>Nombre completo <span class="required">*</span></label>
            <input type="text" class="form-control" [(ngModel)]="form.nombre_completo" name="nombre_completo" required />
          </div>
          <div class="form-group">
            <label>Documento</label>
            <input type="text" class="form-control" [(ngModel)]="form.documento" name="documento" />
          </div>
          <div class="form-group">
            <label>Correo institucional</label>
            <input type="email" class="form-control" [(ngModel)]="form.correo" name="correo" />
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" class="form-control" [(ngModel)]="form.telefono" name="telefono" />
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Datos en el programa</h2>
        <div class="grid">
          <div class="form-group">
            <label>Cargo</label>
            <input type="text" class="form-control" [(ngModel)]="form.cargo" name="cargo" placeholder="Docente titular, catedrático..." />
          </div>
          <div class="form-group">
            <label>Área o línea de enfoque</label>
            <input type="text" class="form-control" [(ngModel)]="form.area_enfoque" name="area_enfoque"
                   list="areas" placeholder="Ej. Neuropsicología" />
            <datalist id="areas">
              @for (a of opciones()?.AREAS ?? []; track a) { <option [value]="a"></option> }
            </datalist>
            <small class="text-muted">Texto libre. Se puede escribir un área que aún no esté en la lista.</small>
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select class="form-control" [(ngModel)]="form.estado" name="estado">
              @for (e of opciones()?.ESTADOS ?? ['Activo', 'Inactivo', 'Jubilado', 'Por contrato', 'Catedrático']; track e) {
                <option [value]="e">{{ e }}</option>
              }
            </select>
          </div>
          <div class="form-group span-2">
            <label>Observaciones</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.observaciones" name="observaciones"></textarea>
          </div>
        </div>
      </section>

      @if (!editando()) {
        <section class="card">
          <h2>Vinculación inicial</h2>
          <p class="text-muted card-nota">
            Se guarda como el primer registro de la pestaña Vinculación. Después podrás agregar cada
            cambio de tipo, dedicación o acto en esa pestaña, y el perfil mostrará siempre el vigente.
          </p>
          <div class="grid">
            <div class="form-group">
              <label>Tipo de vinculación</label>
              <select class="form-control" [(ngModel)]="vinculacion.tipo_vinculacion" name="tipo_vinculacion">
                <option [ngValue]="null">— Sin especificar —</option>
                @for (t of opciones()?.TIPOS_VINCULACION ?? []; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>Dedicación</label>
              <select class="form-control" [(ngModel)]="vinculacion.dedicacion" name="dedicacion">
                <option [ngValue]="null">— Sin especificar —</option>
                @for (d of opciones()?.DEDICACIONES ?? []; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>Año de vinculación</label>
              <input type="number" min="1900" max="2200" class="form-control" [(ngModel)]="vinculacion.anio_vinculacion" name="anio_vinculacion" />
            </div>
            <div class="form-group">
              <label>Fecha de vinculación</label>
              <input type="date" class="form-control" [(ngModel)]="vinculacion.fecha_vinculacion" name="fecha_vinculacion" />
            </div>
            <div class="form-group">
              <label>Tiempo de vinculación</label>
              <select class="form-control" [(ngModel)]="vinculacion.tiempo_vinculacion" name="tiempo_vinculacion">
                <option [ngValue]="null">— Sin especificar —</option>
                @for (t of opciones()?.TIEMPOS_VINCULACION ?? []; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>Horas semanales</label>
              <input type="number" step="0.5" min="0" class="form-control" [(ngModel)]="vinculacion.horas_semanales" name="horas_semanales" />
            </div>
            <div class="form-group span-2">
              <label>Acto de vinculación</label>
              <input type="text" class="form-control" [(ngModel)]="vinculacion.acto_vinculacion" name="acto_vinculacion"
                     placeholder="Ej. Resolución 045 del 12 de marzo de 2026" />
            </div>
          </div>
        </section>
      }

      <div class="acciones">
        <a routerLink="/docentes" class="btn btn-ghost">Cancelar</a>
        <button type="submit" class="btn btn-primary" [disabled]="guardando()">
          @if (guardando()) { <span class="spinner"></span> }
          {{ editando() ? 'Guardar cambios' : 'Registrar docente' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .breadcrumbs { display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;
      a { color: var(--primary); font-weight: 600; } }
    .page-head { margin-bottom: 20px; h1 { font-size: 1.6rem; margin-bottom: 4px; } p { font-size: 0.95rem; max-width: 78ch; } }

    .card {
      background: var(--surface-card); border: 1px solid var(--border-light);
      border-radius: var(--radius); padding: 22px; margin-bottom: 16px;
      h2 { font-size: 1.05rem; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); }
    }
    .card-nota { font-size: 0.85rem; margin-bottom: 16px; }

    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .span-2 { grid-column: 1 / -1; }

    .acciones { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class DocenteFormComponent implements OnInit {
  editando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  opciones = signal<OpcionesDocente | null>(null);
  private id: string | null = null;

  form: FormDocente = {
    nombre_completo: '', documento: '', correo: '', telefono: '',
    cargo: '', area_enfoque: '', estado: 'Activo', observaciones: ''
  };

  vinculacion: VinculacionInicial = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docenteService: DocenteService
  ) {}

  ngOnInit() {
    this.docenteService.opciones().subscribe({
      next: o => {
        this.opciones.set(o);
        if (!this.editando() && o.ESTADOS?.length) this.form.estado = o.ESTADOS[0];
      },
      error: () => {}
    });

    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.editando.set(true);
      this.docenteService.obtener(this.id).subscribe({
        next: d => {
          this.form = {
            nombre_completo: d.nombre_completo ?? '',
            documento: d.documento ?? '',
            correo: d.correo ?? '',
            telefono: d.telefono ?? '',
            cargo: d.cargo ?? '',
            area_enfoque: d.area_enfoque ?? '',
            estado: d.estado ?? 'Activo',
            observaciones: d.observaciones ?? ''
          };
        },
        error: err => this.error.set(err.error?.message || 'No se pudo cargar el docente')
      });
    }
  }

  guardar() {
    this.error.set(null);

    if (!this.form.nombre_completo?.trim()) {
      this.error.set('El nombre completo es obligatorio');
      return;
    }
    if (!this.form.documento?.trim()) {
      this.error.set('El documento (cédula) es obligatorio');
      return;
    }

    this.guardando.set(true);

    if (this.editando()) {
      this.docenteService.actualizar(this.id!, this.form).subscribe({
        next: () => this.router.navigate(['/docentes', this.id]),
        error: err => this.fallar(err, 'No se pudo guardar el docente')
      });
      return;
    }

    const hayVinculacion = Object.values(this.vinculacion).some(v => v !== null && v !== undefined && v !== '');
    const payload: any = { ...this.form };
    if (hayVinculacion) payload.vinculacion = this.vinculacion;

    this.docenteService.crear(payload).subscribe({
      next: res => this.router.navigate(['/docentes', res.id]),
      error: err => this.fallar(err, 'No se pudo registrar el docente')
    });
  }

  private fallar(err: any, mensaje: string) {
    this.guardando.set(false);
    this.error.set(err.error?.message || mensaje);
  }
}
