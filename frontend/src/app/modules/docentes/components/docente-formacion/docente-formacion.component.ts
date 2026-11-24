import { Component, Input } from '@angular/core';
import { DominioDocente, Esquemas, OpcionesDocente } from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/** Pestaña de formación académica. Un docente puede registrar tantos estudios como tenga. */
@Component({
  selector: 'app-docente-formacion',
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
export class DocenteFormacionComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'formaciones';
}
