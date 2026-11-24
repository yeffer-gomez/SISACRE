import { Component, Input, Output, EventEmitter, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Docente, DocenteService, OpcionesDocente } from '../../../../core/services/docente.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Pestaña de información general: los datos que definen a la persona y su
 * estado en el programa. Muestra en solo lectura los valores vigentes
 * resueltos por el backend (tipo de vinculación y escalafón) porque
 * dependen del histórico, no de esta tabla.
 */
@Component({
  selector: 'app-docente-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cabecera">
      <div class="avatar">{{ iniciales() }}</div>
      <div class="cabecera-datos">
        <h2>{{ docente().nombre_completo }}</h2>
        <p class="text-muted">
          {{ docente().cargo || 'Docente' }}
          @if (docente().area_enfoque) { · {{ docente().area_enfoque }} }
        </p>
        <div class="badges">
          <span class="badge" [class.badge-success]="docente().estado === 'Activo'"
                [class.badge-warning]="docente().estado !== 'Activo'">
            {{ docente().estado }}
          </span>
          @if (docente().tipo_vinculacion) {
            <span class="badge badge-info">{{ docente().tipo_vinculacion }}</span>
          }
          @if (docente().nivel_escalafon) {
            <span class="badge">{{ docente().nivel_escalafon }}</span>
          }
          @if (docente().categoria_investigador) {
            <span class="badge badge-purple">{{ docente().categoria_investigador }}</span>
          }
        </div>
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
          @for (c of campos; track c) {
            <div class="form-group" [class.span-2]="c === 'observaciones'">
              <label>{{ etiquetaDe[c] }}</label>
              @if (c === 'estado') {
                <select class="form-control" [(ngModel)]="form['estado']" name="estado">
                  @for (e of opciones().ESTADOS; track e) { <option [value]="e">{{ e }}</option> }
                </select>
              } @else if (c === 'observaciones') {
                <textarea class="form-control" rows="3" [(ngModel)]="form['observaciones']" name="observaciones"></textarea>
              } @else {
                <input type="text" class="form-control" [(ngModel)]="form[c]" [name]="c" />
              }
            </div>
          }
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

    @if (docente().conteos; as c) {
      <ng-container>
      <div class="bloque">
        <h3>Resumen de registros</h3>
        <div class="conteos">
          <div class="conteo"><span class="conteo-valor">{{ c.vinculaciones }}</span><span class="conteo-label">Vinculaciones</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.formaciones }}</span><span class="conteo-label">Formaciones</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.escalafones }}</span><span class="conteo-label">Escalafones</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.evaluaciones }}</span><span class="conteo-label">Evaluaciones</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.mejoramientos }}</span><span class="conteo-label">Mejoramientos</span></div>
          <div class="conteo"><span class="conteo-valor">{{ c.redes }}</span><span class="conteo-label">Redes</span></div>
        </div>
      </div>
      </ng-container>
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

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
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
export class DocenteInfoComponent {
  // Signal de entrada: el template y los métodos la invocan como
  // `docente()`. Con un @Input clásico sería una propiedad y habría que
  // cambiar todas las llamadas.
  readonly docente = input.required<Docente>();
  readonly opciones = input.required<OpcionesDocente>();

  /** Emite los campos editados para que el perfil refresque la cabecera. */
  @Output() actualizado = new EventEmitter<Record<string, any>>();

  readonly campos = ['documento', 'correo', 'telefono', 'cargo', 'area_enfoque', 'estado', 'observaciones'];

  /** Etiqueta legible de cada campo editable. */
  readonly etiquetaDe: Record<string, string> = {
    documento: 'Documento',
    correo: 'Correo institucional',
    telefono: 'Teléfono',
    cargo: 'Cargo',
    area_enfoque: 'Área de enfoque',
    estado: 'Estado',
    observaciones: 'Observaciones'
  };

  editando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  form: Record<string, any> = {};

  constructor(private docenteService: DocenteService, private auth: AuthService) {}

  puedeEditar() {
    return this.auth.hasRole('administrador') || this.auth.hasRole('coordinador');
  }

  iniciales(): string {
    return (this.docente().nombre_completo || '?')
      .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  datos() {
    const d = this.docente();
    return [
      { etiqueta: 'Documento', valor: d.documento },
      { etiqueta: 'Correo', valor: d.correo },
      { etiqueta: 'Teléfono', valor: d.telefono },
      { etiqueta: 'Vinculación vigente', valor: d.tipo_vinculacion },
      { etiqueta: 'Dedicación', valor: d.dedicacion },
      { etiqueta: 'Escalafón', valor: d.nivel_escalafon },
      { etiqueta: 'Categoría', valor: d.categoria_escalafon }
    ].filter(x => x.valor);
  }

  /** Etiqueta de un campo del listado `datos()` para el `track` del @for. */
  trackPorEtiqueta(_: number, d: { etiqueta: string }): string {
    return d.etiqueta;
  }

  editar() {
    this.form = {};
    for (const c of this.campos) this.form[c] = (this.docente() as any)[c] ?? '';
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
    this.docenteService.actualizar(this.docente().id, this.form).subscribe({
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
