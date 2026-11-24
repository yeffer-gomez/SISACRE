import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DominioDocente, Esquemas, OpcionesDocente } from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/**
 * Envoltura de la pestaña de vinculación.
 * El listado y el formulario los resuelve `DocenteRegistroComponent`;
 * aquí sólo se aporta la línea de tiempo de cambios de tipo de
 * vinculación, que es la lectura que más se consulta del Factor 3.
 */
@Component({
  selector: 'app-docente-vinculacion',
  standalone: true,
  imports: [CommonModule, DocenteRegistroComponent],
  template: `
    <app-docente-registro
      [docenteId]="docenteId"
      [dominio]="dominio"
      [esquemas]="esquemas"
      [opciones]="opciones"
    />
  `
})
export class DocenteVinculacionComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'vinculaciones';
}
