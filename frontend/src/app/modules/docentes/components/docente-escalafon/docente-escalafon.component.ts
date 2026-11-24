import { Component, Input } from '@angular/core';
import { DominioDocente, Esquemas, OpcionesDocente } from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/** Pestaña de escalafón docente (Ley 1279 de 2002). Los ascensos se acumulan. */
@Component({
  selector: 'app-docente-escalafon',
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
export class DocenteEscalafonComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'escalafones';
}
