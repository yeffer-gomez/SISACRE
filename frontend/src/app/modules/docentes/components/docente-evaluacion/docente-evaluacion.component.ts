import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DominioDocente, Esquemas, OpcionesDocente, RegistroDocente
} from '../../../../core/services/docente.service';
import { DocenteRegistroComponent } from '../docente-registro/docente-registro.component';

/**
 * Pestaña de evaluación docente.
 *
 * Cada evaluador (estudiantes, autoevaluación, colegas, jefes, externas) se
 * guarda en su propia fila, tal como exige el Factor 3. Esta pestaña los
 * muestra sin mezclarlos y calcula el promedio por evaluador únicamente a
 * partir de los registros reales.
 */
@Component({
  selector: 'app-docente-evaluacion',
  standalone: true,
  imports: [CommonModule, DocenteRegistroComponent],
  template: `
    @if (hayResultados()) {
      <div class="resumen">
        <h3>Promedio por evaluador</h3>
        <p class="text-muted">Calculado sobre {{ registros().length }} registro(s) registrados</p>
        <div class="barras">
          @for (p of promedios(); track p.etiqueta) {
            <div class="barra-fila">
              <span class="barra-label">{{ p.etiqueta }}</span>
              <div class="barra-track">
                <div class="barra-fill" [style.width.%]="p.porcentaje"></div>
              </div>
              <span class="barra-valor">{{ p.promedio }} <small>({{ p.total }})</small></span>
            </div>
          }
        </div>
      </div>
    }

    <app-docente-registro
      [docenteId]="docenteId"
      [dominio]="dominio"
      [esquemas]="esquemas"
      [opciones]="opciones"
      (registrosCargados)="onCargados($event)"
    />
  `,
  styles: [`
    .resumen {
      background: var(--surface-card); border: 1px solid var(--border-light);
      border-radius: var(--radius); padding: 20px; margin-bottom: 18px;
      h3 { font-size: 1.05rem; margin-bottom: 4px; }
      > p { font-size: 0.82rem; margin-bottom: 16px; }
    }

    .barras { display: flex; flex-direction: column; gap: 12px; }

    .barra-fila {
      display: grid; grid-template-columns: 150px 1fr 90px;
      align-items: center; gap: 12px;
    }

    .barra-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }

    .barra-track {
      height: 10px; background: var(--border-light); border-radius: 100px; overflow: hidden;
    }

    .barra-fill {
      height: 100%; border-radius: 100px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
      transition: width 0.4s ease;
    }

    .barra-valor { font-size: 0.9rem; font-weight: 600; text-align: right; }
    .barra-valor small { font-weight: 500; color: var(--text-muted); }

    @media (max-width: 640px) {
      .barra-fila { grid-template-columns: 110px 1fr 70px; }
    }
  `]
})
export class DocenteEvaluacionComponent {
  @Input({ required: true }) docenteId!: string;
  @Input({ required: true }) esquemas!: Esquemas;
  @Input({ required: true }) opciones!: OpcionesDocente;

  readonly dominio: DominioDocente = 'evaluaciones';

  registros = signal<RegistroDocente[]>([]);
  hayResultados = signal(false);

  promedios = computed(() => {
    const porTipo = new Map<string, { suma: number; total: number }>();
    for (const r of this.registros()) {
      if (r.resultado === null || r.resultado === undefined) continue;
      const clave = r.evaluador || 'Sin evaluador';
      const acc = porTipo.get(clave) ?? { suma: 0, total: 0 };
      acc.suma += Number(r.resultado);
      acc.total += 1;
      porTipo.set(clave, acc);
    }
    if (porTipo.size === 0) return [];

    // La barra se normaliza sobre el mejor promedio para que los valores
    // absolutos (dependen de la escala: 0-5, 1-7, 1-100) sean comparables.
    const maximo = Math.max(...[...porTipo.values()].map(v => v.suma / v.total), 1);
    return [...porTipo.entries()]
      .map(([etiqueta, v]) => {
        const promedio = Math.round((v.suma / v.total) * 100) / 100;
        return { etiqueta, promedio, total: v.total, porcentaje: (promedio / maximo) * 100 };
      })
      .sort((a, b) => b.promedio - a.promedio);
  });

  onCargados(registros: RegistroDocente[]) {
    this.registros.set(registros);
    this.hayResultados.set(registros.some(r => r.resultado !== null && r.resultado !== undefined));
  }
}
