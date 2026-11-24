import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoHistorico, DocenteService } from '../../../../core/services/docente.service';

/**
 * Línea de tiempo del docente.
 *
 * No es una tabla más: es la vista que permite recorrer de un vistazo
 * toda la trayectoria registrada en los nueve dominios, ordenada por
 * fecha. Los eventos llegan ya aplanados desde
 * `GET /api/docentes/:id/historico`.
 */
@Component({
  selector: 'app-docente-historico',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="registro-header">
      <div>
        <h2>Histórico</h2>
        <p class="text-muted">Trayectoria consolidada de los {{ eventos().length }} registros del docente, sin importar la pestaña donde se digitó.</p>
      </div>
      <div class="filtros">
        <button class="chip" [class.activo]="categoria() === 'Todas'"
                (click)="categoria.set('Todas')">Todas</button>
        @for (c of categorias(); track c) {
          <button class="chip" [class.activo]="categoria() === c" (click)="categoria.set(c)">{{ etiquetaCategoria(c) }}</button>
        }
      </div>
    </div>

    @if (cargando()) {
      <div class="loading-overlay"><div class="spinner spinner-dark"></div></div>
    } @else if (filtrados().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">🕰️</div>
        <h3>Sin eventos</h3>
        <p>{{ eventos().length === 0 ? 'Todavía no hay historial registrado.' : 'No hay eventos en esta categoría.' }}</p>
      </div>
    } @else {
      <ol class="linea">
        @for (e of filtrados(); track e.registro_id + e.fecha + e.titulo) {
          <li>
            <div class="punto" [attr.data-cat]="e.categoria"></div>
            <div class="evento">
              <div class="evento-cabecera">
                <span class="evento-categoria">{{ etiquetaCategoria(e.categoria) }}</span>
                <span class="evento-fecha">
                  @if (e.fecha) {
                    {{ e.fecha | date:'dd/MM/yyyy' }}
                  } @else if (e.anio) {
                    {{ e.anio }}
                  }
                </span>
              </div>
              <h4>{{ e.titulo }}</h4>
              @if (e.detalle) { <p class="evento-detalle">{{ e.detalle }}</p> }
              @if (e.observaciones) { <p class="evento-obs">{{ e.observaciones }}</p> }
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: [`
    .registro-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
      h2 { font-size: 1.25rem; margin-bottom: 4px; }
      p { font-size: 0.875rem; max-width: 70ch; }
    }

    .filtros { display: flex; gap: 6px; flex-wrap: wrap; }

    .chip {
      border: 1px solid var(--border); background: var(--surface-card);
      border-radius: 100px; padding: 5px 12px; font-size: 0.78rem; font-weight: 600;
      color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
      &:hover { border-color: var(--primary); color: var(--primary); }
      &.activo { background: var(--primary); border-color: var(--primary); color: #fff; }
    }

    .linea { list-style: none; position: relative; padding-left: 26px; }
    .linea::before {
      content: ''; position: absolute; left: 7px; top: 6px; bottom: 6px;
      width: 2px; background: var(--border-light);
    }

    li { position: relative; padding-bottom: 20px; }

    .punto {
      position: absolute; left: -23px; top: 5px;
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--primary); border: 2px solid var(--surface-card);
      box-shadow: 0 0 0 2px var(--border-light);
    }

    .evento {
      background: var(--surface-card); border: 1px solid var(--border-light);
      border-radius: var(--radius); padding: 14px 16px;
      h4 { font-size: 0.98rem; font-weight: 600; margin: 4px 0; }
    }

    .evento-cabecera { display: flex; justify-content: space-between; align-items: center; gap: 10px; }

    .evento-categoria {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
      font-weight: 700; color: var(--primary);
    }

    .evento-fecha { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .evento-detalle { font-size: 0.88rem; color: var(--text-secondary); }
    .evento-obs { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }

    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 26px; height: 26px; }
  `]
})
export class DocenteHistoricoComponent implements OnInit {
  @Input({ required: true }) docenteId!: string;

  eventos = signal<EventoHistorico[]>([]);
  cargando = signal(true);
  categoria = signal('Todas');

  categorias = computed(() => [...new Set(this.eventos().map(e => e.categoria))]);
  filtrados = computed(() => {
    const c = this.categoria();
    return c === 'Todas' ? this.eventos() : this.eventos().filter(e => e.categoria === c);
  });

  constructor(private docenteService: DocenteService) {}

  ngOnInit() {
    this.docenteService.historico(this.docenteId).subscribe({
      next: res => {
        this.eventos.set(res.data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  etiquetaCategoria(c: string): string {
    return c
      .split('-')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }
}
