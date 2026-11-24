import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EgresadoService, Esquemas, OpcionesEgresado, CatalogoEgresado
} from '../../../core/services/egresado.service';
import { EgresadoRegistroComponent } from '../components/egresado-registro/egresado-registro.component';

const CATALOGOS_VALIDOS: CatalogoEgresado[] = ['politicas', 'formacion-continua'];

/**
 * Página de los catálogos globales del Factor 4 (políticas en torno a
 * egresados y formación continua), que no cuelgan de un egresado concreto.
 * Reutiliza el mismo componente de registro genérico que las pestañas.
 */
@Component({
  selector: 'app-egresado-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink, EgresadoRegistroComponent],
  template: `
    <nav class="breadcrumbs">
      <a routerLink="/egresados">Egresados</a>
      <span>/</span>
      <span>{{ titulo() }}</span>
    </nav>

    @if (cargando()) {
      <div class="loading-overlay" style="min-height:280px"><div class="spinner spinner-dark"></div></div>
    } @else if (!dominio()) {
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Catálogo no válido</h3>
        <p>La sección solicitada no existe.</p>
        <a routerLink="/egresados" class="btn btn-primary" style="margin-top:16px">Volver a egresados</a>
      </div>
    } @else {
      @if (esquemas(); as es) {
        @if (opciones(); as op) {
          <app-egresado-registro [dominio]="dominio()!" [esquemas]="es" [opciones]="op" />
        }
      }
    }
  `,
  styles: [`
    .breadcrumbs {
      display: flex; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;
      a { color: var(--primary); font-weight: 600; }
    }
    .spinner-dark { border-color: var(--primary); border-top-color: transparent; width: 30px; height: 30px; }
  `]
})
export class EgresadoCatalogoComponent implements OnInit {
  dominio = signal<CatalogoEgresado | null>(null);
  esquemas = signal<Esquemas | null>(null);
  opciones = signal<OpcionesEgresado | null>(null);
  cargando = signal(true);

  constructor(private route: ActivatedRoute, private egresadoService: EgresadoService) {}

  ngOnInit() {
    const dominio = this.route.snapshot.paramMap.get('dominio') as CatalogoEgresado;
    if (CATALOGOS_VALIDOS.includes(dominio)) this.dominio.set(dominio);

    this.egresadoService.configuracion().subscribe({
      next: res => {
        this.esquemas.set(res.esquemas);
        this.opciones.set(res.opciones);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  titulo(): string {
    return this.dominio() === 'politicas' ? 'Políticas' : 'Formación continua';
  }
}
