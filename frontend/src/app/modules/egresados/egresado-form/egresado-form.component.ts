import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EgresadoService, FormEgresado } from '../../../core/services/egresado.service';

@Component({
  selector: 'app-egresado-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="breadcrumbs">
      <a routerLink="/egresados">Egresados</a>
      <span>/</span>
      <span>{{ editando() ? 'Editar' : 'Nuevo' }}</span>
    </nav>

    <header class="page-head">
      <h1>{{ editando() ? 'Editar egresado' : 'Registrar egresado' }}</h1>
      <p class="text-muted">
        {{ editando()
          ? 'Modifica los datos de identificación. Las vinculaciones, bienestar, seguimiento y reconocimientos se registran en las pestañas de su ficha.'
          : 'Crea la ficha del egresado. Después podrás completar sus pestañas de grupos, posgrados, bienestar, seguimiento y reconocimientos.' }}
      </p>
    </header>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    <form (ngSubmit)="guardar()" class="form">
      <section class="card">
        <h2>Datos de identificación</h2>
        <div class="grid">
          <div class="form-group span-2">
            <label>Nombre completo <span class="required">*</span></label>
            <input type="text" class="form-control" [(ngModel)]="form.nombre_completo" name="nombre_completo" required />
          </div>
          <div class="form-group">
            <label>Cédula <span class="required">*</span></label>
            <input type="text" class="form-control" [(ngModel)]="form.cedula" name="cedula" required />
          </div>
          <div class="form-group">
            <label>Titulación</label>
            <input type="text" class="form-control" [(ngModel)]="form.titulacion" name="titulacion"
                   placeholder="Ej. Psicólogo(a)" />
          </div>
          <div class="form-group">
            <label>Año de graduación</label>
            <input type="number" min="1900" max="2200" class="form-control"
                   [(ngModel)]="form.anio_graduacion" name="anio_graduacion" />
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" class="form-control" [(ngModel)]="form.telefono" name="telefono" />
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" class="form-control" [(ngModel)]="form.correo" name="correo" />
          </div>
          <div class="form-group span-2">
            <label>Observaciones</label>
            <textarea class="form-control" rows="2" [(ngModel)]="form.observaciones" name="observaciones"></textarea>
          </div>
        </div>
      </section>

      <div class="acciones">
        <a routerLink="/egresados" class="btn btn-ghost">Cancelar</a>
        <button type="submit" class="btn btn-primary" [disabled]="guardando()">
          @if (guardando()) { <span class="spinner"></span> }
          {{ editando() ? 'Guardar cambios' : 'Registrar egresado' }}
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

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .span-2 { grid-column: 1 / -1; }

    .acciones { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class EgresadoFormComponent implements OnInit {
  editando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  private id: string | null = null;

  form: FormEgresado = {
    nombre_completo: '', cedula: '', titulacion: '', anio_graduacion: null,
    telefono: '', correo: '', observaciones: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private egresadoService: EgresadoService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.editando.set(true);
      this.egresadoService.obtener(this.id).subscribe({
        next: d => {
          this.form = {
            nombre_completo: d.nombre_completo ?? '',
            cedula: d.cedula ?? '',
            titulacion: d.titulacion ?? '',
            anio_graduacion: d.anio_graduacion ?? null,
            telefono: d.telefono ?? '',
            correo: d.correo ?? '',
            observaciones: d.observaciones ?? ''
          };
        },
        error: err => this.error.set(err.error?.message || 'No se pudo cargar el egresado')
      });
    }
  }

  guardar() {
    this.error.set(null);

    if (!this.form.nombre_completo?.trim()) {
      this.error.set('El nombre completo es obligatorio');
      return;
    }
    if (!this.form.cedula?.trim()) {
      this.error.set('La cédula es obligatoria');
      return;
    }

    this.guardando.set(true);

    if (this.editando()) {
      this.egresadoService.actualizar(this.id!, this.form).subscribe({
        next: () => this.router.navigate(['/egresados', this.id]),
        error: err => this.fallar(err, 'No se pudo guardar el egresado')
      });
      return;
    }

    this.egresadoService.crear(this.form).subscribe({
      next: res => this.router.navigate(['/egresados', res.id]),
      error: err => this.fallar(err, 'No se pudo registrar el egresado')
    });
  }

  private fallar(err: any, mensaje: string) {
    this.guardando.set(false);
    this.error.set(err.error?.message || mensaje);
  }
}
