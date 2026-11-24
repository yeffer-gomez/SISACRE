import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TitleCasePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  roles: string[];
  created_at: string;
}

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Gestión de Usuarios</h1>
        <p class="text-muted">{{ usuarios().length }} usuario(s) registrado(s)</p>
      </div>
      <button class="btn btn-accent" (click)="mostrarFormRegistro.set(true)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo Usuario
      </button>
    </div>

    <!-- Registro Modal -->
    @if (mostrarFormRegistro()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="card-header" style="padding:20px 24px">
            <h3>Registrar Usuario</h3>
            <button class="btn btn-ghost btn-icon" (click)="mostrarFormRegistro.set(false)">✕</button>
          </div>
          <div style="padding:24px">
            @if (errorRegistro()) {
              <div class="alert alert-danger" style="margin-bottom:14px">{{ errorRegistro() }}</div>
            }
            @if (exitoRegistro()) {
              <div class="alert alert-success" style="margin-bottom:14px">{{ exitoRegistro() }}</div>
            }
            <div style="display:flex;flex-direction:column;gap:16px">
              <div class="form-group">
                <label>Nombre completo <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="registroForm.nombre" placeholder="Nombre del usuario" />
              </div>
              <div class="form-group">
                <label>Correo institucional <span class="required">*</span></label>
                <input type="email" class="form-control" [(ngModel)]="registroForm.correo" placeholder="usuario@udenar.edu.co" />
              </div>
              <div class="form-group">
                <label>Contraseña <span class="required">*</span></label>
                <input type="password" class="form-control" [(ngModel)]="registroForm.password" placeholder="Mínimo 8 caracteres" />
              </div>
              <div class="form-group">
                <label>Rol</label>
                <select class="form-control" [(ngModel)]="registroForm.rol_id">
                  @for (r of roles(); track r.id) {
                    <option [ngValue]="r.id">{{ r.nombre | titlecase }}</option>
                  }
                </select>
              </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
              <button class="btn btn-outline" (click)="mostrarFormRegistro.set(false)">Cancelar</button>
              <button class="btn btn-primary" (click)="registrarUsuario()" [disabled]="registrando()">
                @if (registrando()) { <span class="spinner"></span> } Registrar
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Roles Modal -->
    @if (usuarioEditandoRoles()) {
      <div class="modal-overlay" (click)="cerrarModal($event)">
        <div class="modal">
          <div class="card-header" style="padding:20px 24px">
            <h3>Roles — {{ usuarioEditandoRoles()?.nombre }}</h3>
            <button class="btn btn-ghost btn-icon" (click)="usuarioEditandoRoles.set(null)">✕</button>
          </div>
          <div style="padding:24px">
            <p class="text-muted text-sm" style="margin-bottom:16px">Selecciona los roles para este usuario:</p>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
              @for (rol of roles(); track rol.id) {
                <label class="role-checkbox">
                  <input type="checkbox" [checked]="rolesSeleccionados().includes(rol.id)" (change)="toggleRol(rol.id)" />
                  <div class="role-info">
                    <span class="role-name">{{ rol.nombre | titlecase }}</span>
                    <span class="role-desc text-muted text-xs">{{ rol.descripcion }}</span>
                  </div>
                </label>
              }
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end">
              <button class="btn btn-outline" (click)="usuarioEditandoRoles.set(null)">Cancelar</button>
              <button class="btn btn-primary" (click)="guardarRoles()" [disabled]="guardandoRoles()">
                @if (guardandoRoles()) { <span class="spinner"></span> } Guardar roles
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Users table -->
    <div class="card">
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner" style="border-color:var(--primary);border-top-color:transparent;width:32px;height:32px"></div>
          <span>Cargando usuarios...</span>
        </div>
      } @else if (usuarios().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No hay usuarios registrados</h3>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="sisacre-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr [class.inactive-row]="!u.activo">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar-sm">{{ u.nombre.charAt(0).toUpperCase() }}</div>
                      <span class="fw-600">{{ u.nombre }}</span>
                    </div>
                  </td>
                  <td class="text-sm">{{ u.correo }}</td>
                  <td>
                    <div style="display:flex;flex-wrap:wrap;gap:4px">
                      @for (rol of (u.roles ?? []); track rol) {
                        <span class="badge" [class]="getRolBadge(rol)">{{ rol }}</span>
                      }
                      @if (!u.roles?.length) {
                        <span class="text-muted text-xs">Sin roles</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="u.activo ? 'badge-success' : 'badge-danger'">
                      {{ u.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="text-sm text-muted">{{ formatDate(u.created_at) }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn-ghost btn-icon btn-sm" title="Gestionar roles" (click)="abrirGestionRoles(u)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </button>
                      @if (u.id !== auth.currentUser()?.id) {
                        <button
                          class="btn btn-icon btn-sm"
                          [class]="u.activo ? 'btn-ghost' : 'btn-ghost'"
                          [title]="u.activo ? 'Desactivar' : 'Activar'"
                          (click)="toggleEstado(u)"
                        >
                          @if (u.activo) {
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                          } @else {
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          }
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { font-size: 1.75rem; margin-bottom: 4px; }
    }

    .action-btns { display: flex; gap: 4px; }

    .inactive-row td { opacity: 0.55; }

    .user-cell { display: flex; align-items: center; gap: 10px; }

    .user-avatar-sm {
      width: 32px; height: 32px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.8rem;
      flex-shrink: 0;
    }

    .role-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: border-color 0.2s;
      &:hover { border-color: var(--primary-light); }

      input[type="checkbox"] {
        width: 18px; height: 18px;
        margin-top: 2px; flex-shrink: 0;
        accent-color: var(--primary);
        cursor: pointer;
      }
    }

    .role-info { display: flex; flex-direction: column; gap: 2px; }
    .role-name { font-weight: 600; font-size: 0.9rem; }
    .role-desc { }
  `]
})
export class UserListComponent implements OnInit {
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  loading = signal(true);
  mostrarFormRegistro = signal(false);
  usuarioEditandoRoles = signal<Usuario | null>(null);
  rolesSeleccionados = signal<number[]>([]);
  registrando = signal(false);
  guardandoRoles = signal(false);
  errorRegistro = signal('');
  exitoRegistro = signal('');

  registroForm = { nombre: '', correo: '', password: '', rol_id: 4 };

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  cargarUsuarios() {
    this.loading.set(true);
    this.http.get<Usuario[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (data) => { this.usuarios.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  cargarRoles() {
    this.http.get<Rol[]>(`${environment.apiUrl}/roles`).subscribe(data => this.roles.set(data));
  }

  registrarUsuario() {
    const { nombre, correo, password, rol_id } = this.registroForm;
    if (!nombre || !correo || !password) { this.errorRegistro.set('Todos los campos son obligatorios'); return; }
    this.registrando.set(true);
    this.errorRegistro.set('');

    this.http.post(`${environment.apiUrl}/auth/register`, { nombre, correo, password, rol_id }).subscribe({
      next: () => {
        this.exitoRegistro.set('Usuario registrado exitosamente');
        this.registroForm = { nombre: '', correo: '', password: '', rol_id: 4 };
        this.registrando.set(false);
        this.cargarUsuarios();
        setTimeout(() => {
          this.mostrarFormRegistro.set(false);
          this.exitoRegistro.set('');
        }, 1500);
      },
      error: (err) => {
        this.errorRegistro.set(err.error?.message || 'Error al registrar usuario');
        this.registrando.set(false);
      }
    });
  }

  abrirGestionRoles(u: Usuario) {
    this.usuarioEditandoRoles.set(u);
    const rolIds = this.roles()
      .filter(r => (u.roles ?? []).includes(r.nombre))
      .map(r => r.id);
    this.rolesSeleccionados.set(rolIds);
  }

  toggleRol(rolId: number) {
    this.rolesSeleccionados.update(current =>
      current.includes(rolId)
        ? current.filter(id => id !== rolId)
        : [...current, rolId]
    );
  }

  guardarRoles() {
    const u = this.usuarioEditandoRoles()!;
    this.guardandoRoles.set(true);
    this.http.put(`${environment.apiUrl}/usuarios/${u.id}/roles`, { rol_ids: this.rolesSeleccionados() }).subscribe({
      next: () => {
        this.usuarioEditandoRoles.set(null);
        this.guardandoRoles.set(false);
        this.cargarUsuarios();
      },
      error: () => this.guardandoRoles.set(false)
    });
  }

  toggleEstado(u: Usuario) {
    const accion = u.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Desea ${accion} al usuario "${u.nombre}"?`)) return;
    this.http.put(`${environment.apiUrl}/usuarios/${u.id}/estado`, { activo: !u.activo }).subscribe(() => this.cargarUsuarios());
  }

  cerrarModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.mostrarFormRegistro.set(false);
      this.usuarioEditandoRoles.set(null);
    }
  }

  getRolBadge(rol: string): string {
    const map: Record<string, string> = {
      administrador: 'badge-danger',
      coordinador: 'badge-primary',
      evaluador: 'badge-accent',
      docente: 'badge-success',
    };
    return map[rol] ?? 'badge-neutral';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
