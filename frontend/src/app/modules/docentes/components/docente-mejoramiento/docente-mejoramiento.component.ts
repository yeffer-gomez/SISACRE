import { Component, Input } from '@angular/core';
import { DominioDocente, Esquemas, OpcionesDocente } from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/**
 * Pestaña de planes de mejoramiento. Los estados posibles son
 * Pendiente, En proceso y Cumplido; ningún registro se elimina.
 */
@Component({
  selector: 'app-docente-mejoramiento',
  standalone: true,
  imports: [DocenteRegistroComponent],
  template: `
    <app-docente-registro
      [docenteId]="docenteId"
      [dominio]="dominio"
      [esquemas]="esquemas"
      [opciones]="opciones"
    />
  `
})
export class DocenteMejoramientoComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'mejoramientos';
}
