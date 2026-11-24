import { Component, Output, EventEmitter, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Egresado, EgresadoService } from '../../../../core/services/egresado.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Pestaña de Información general del egresado: los datos de caracterización
 * (Nombre, Cédula, Titulación, Año, Teléfono, Correo) y un resumen de los
 * registros asociados.
 */
@Component({
  selector: 'app-egresado-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cabecera">
      <div class="avatar">{{ iniciales() }}</div>
      <div class="cabecera-datos">
        <h2>{{ egresado().nombre_completo }}</h2>
        <p class="text-muted">C.C. {{ egresado().cedula }}@if (egresado().titulacion) { · {{ egresado().titulacion }} }</p>
        @if (egresado().anio_graduacion) {
          <div class="badges">
            <span class="badge badge-info">Graduado {{ egresado().anio_graduacion }}</span>
          </div>
        }
      </div>
    </div>

    <div class="bloque">
      <div class="bloque-head">
        <h3>Datos de identificación</h3>
        @if (puedeEditar() && !editando()) {
          <button class="btn btn-ghost btn-sm" (click)="editar()">Editar</button>
        }
      </div>

      @if (!editando()) {
        <dl class="datos">
          @for (d of datos(); track d.etiqueta) {
            <div class="dato">
              <dt>{{ d.etiqueta }}</dt>
              <dd>{{ d.valor }}</dd>
            </div>
          }
        </dl>
      } @else {
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" class="form-control" [(ngModel)]="form['nombre_completo']" name="nombre_completo" />
          </div>
          <div class="form-group">
            <label>Cédula</label>
            <input type="text" class="form-control" [(ngModel)]="form['cedula']" name="cedula" />
          </div>
          <div class="form-group">
            <label>Titulación</label>
            <input type="text" class="form-control" [(ngModel)]="form['titulacion']" name="titulacion" />
          </div>
          <div class="form-group">
            <label>Año de graduación</label>
            <input type="number" min="1900" max="2200" class="form-control" [(ngModel)]="form['anio_graduacion']" name="anio_graduacion" />
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" class="form-control" [(ngModel)]="form['telefono']" name="telefono" />
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" class="form-control" [(ngModel)]="form['correo']" name="correo" />
          </div>
          <div class="form-group span-2">
            <label>Observaciones</label>
            <textarea class="form-control" rows="3" [(ngModel)]="form['observaciones']" name="observaciones"></textarea>
          </div>
        </div>
        <div class="acciones">
          <button class="btn btn-ghost" (click)="cancelar()">Cancelar</button>
          <button class="btn btn-primary" (click)="guardar()" [disabled]="guardando()">
            @if (guardando()) { <span class="spinner"></span> }
            Guardar
          </button>
        </div>
      }
    </div>

    @if (egresado().conteos; as c) {
      <div class="bloque">
        <h3>Resumen de registros</h3>
        <div class="conteos">
          <div class="conteo"><span class="conteo-valor">{{ c.grupos }}</span><span class="conteo-label">Grupos</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.posgrados }}</span><span class="conteo-label">Posgrados</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.bienestar }}</span><span class="conteo-label">Bienestar</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.seguimiento_grado }}</span><span class="conteo-label">Seguimiento</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.reconocimientos }}</span><span class="conteo-label">Reconocimientos</span></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cabecera { display: flex; gap: 18px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
    .avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; font-weight: 700; flex-shrink: 0;
    }
    .cabecera-datos h2 { font-size: 1.35rem; margin-bottom: 2px; }
    .cabecera-datos p { font-size: 0.9rem; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }

    .bloque {
      background: var(--surface-card); border: 1px solid var(--border-light);
      border-radius: var(--radius); padding: 20px; margin-bottom: 16px;
      h3 { font-size: 1.02rem; margin-bottom: 14px; }
    }
    .bloque-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; h3 { margin-bottom: 0; } }

    .datos {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px 20px;
      dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; }
      dd { font-size: 0.92rem; font-weight: 500; margin-top: 3px; }
    }

    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .span-2 { grid-column: 1 / -1; }
    .acciones { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    .conteos { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .conteo {
      text-align: center; padding: 14px; background: var(--surface-page);
      border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 2px;
    }
    .conteo-valor { font-size: 1.5rem; font-weight: 700; color: var(--primary); line-height: 1.1; }
    .conteo-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }

    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class EgresadoInfoComponent {
  readonly egresado = input.required<Egresado>();

  @Output() actualizado = new EventEmitter<Record<string, any>>();

  readonly campos = ['nombre_completo', 'cedula', 'titulacion', 'anio_graduacion', 'telefono', 'correo', 'observaciones'];

  editando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  form: Record<string, any> = {};

  constructor(private egresadoService: EgresadoService, private auth: AuthService) {}

  puedeEditar() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  iniciales(): string {
    return (this.egresado().nombre_completo || '?')
      .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  datos() {
    const d = this.egresado();
    return [
      { etiqueta: 'Nombre', valor: d.nombre_completo },
      { etiqueta: 'Cédula', valor: d.cedula },
      { etiqueta: 'Titulación', valor: d.titulacion },
      { etiqueta: 'Año', valor: d.anio_graduacion },
      { etiqueta: 'Teléfono', valor: d.telefono },
      { etiqueta: 'Correo electrónico', valor: d.correo }
    ].filter(x => x.valor !== null && x.valor !== undefined && x.valor !== '');
  }

  editar() {
    this.form = {};
    for (const c of this.campos) this.form[c] = (this.egresado() as any)[c] ?? '';
    this.error.set(null);
    this.editando.set(true);
  }

  cancelar() {
    this.editando.set(false);
    this.error.set(null);
  }

  guardar() {
    this.guardando.set(true);
    this.error.set(null);
    this.egresadoService.actualizar(this.egresado().id, this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(false);
        this.actualizado.emit(this.form);
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err.error?.message || 'No se pudo guardar');
      }
    });
  }
}
