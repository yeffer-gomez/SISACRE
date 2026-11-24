import { Component, Input } from '@angular/core';
import { DominioDocente, Esquemas, OpcionesDocente } from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/**
 * Pestaña de participación en redes académicas.
 * El <select> de red se llena desde `redes_academicas` mediante el
 * endpoint dinámico declarado en el esquema del dominio `redes`.
 */
@Component({
  selector: 'app-docente-red',
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
export class DocenteRedComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'redes';
}
