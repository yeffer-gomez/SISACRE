import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.sidebar-collapsed]="collapsed()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <svg width="26" height="40" viewBox="0 0 400 520" fill="none">
              <defs>
                <clipPath id="stc"><rect x="0" y="0" width="400" height="260"/></clipPath>
                <clipPath id="sbc"><rect x="0" y="260" width="400" height="270"/></clipPath>
              </defs>
              <!-- Banda izquierda superior (turquesa) -->
              <path d="M 48,68 L 148,68 C 148,68 118,138 118,260 C 50,242 16,178 16,260 C 16,168 16,128 48,68 Z" fill="#a5b4fc" clip-path="url(#stc)"/>
              <!-- Banda izquierda inferior (verde oscuro) -->
              <path d="M 48,452 L 148,452 C 148,452 118,382 118,260 C 50,278 16,342 16,260 C 16,352 16,392 48,452 Z" fill="#4338ca" clip-path="url(#sbc)"/>
              <!-- Banda derecha superior (turquesa) -->
              <path d="M 352,68 L 252,68 C 252,68 282,138 282,260 C 350,242 384,178 384,260 C 384,168 384,128 352,68 Z" fill="#a5b4fc" clip-path="url(#stc)"/>
              <!-- Banda derecha inferior (verde oscuro) -->
              <path d="M 352,452 L 252,452 C 252,452 282,382 282,260 C 350,278 384,342 384,260 C 384,352 384,392 352,452 Z" fill="#4338ca" clip-path="url(#sbc)"/>
            </svg>
            <span class="logo-text">SISACRE</span>
          </div>
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </a>

          <a routerLink="/documentos" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Documentos</span>
          </a>

          <a routerLink="/proyectos" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
            </svg>
            <span>Investigación</span>
          </a>

          <a routerLink="/docentes" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10L12 5 2 10l10 5 10-5z"/>
              <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>
            </svg>
            <span>Docentes</span>
          </a>

          <a routerLink="/egresados" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10 12 5 2 10l10 5 10-5z"/>
              <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
              <path d="M22 10v6"/>
            </svg>
            <span>Egresados</span>
          </a>

          @if (auth.hasRole('administrador')) {
            <a routerLink="/usuarios" routerLinkActive="active" class="nav-item">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Usuarios</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{ userInitial() }}</div>
            <div class="user-details">
              <span class="user-name">{{ auth.currentUser()?.nombre }}</span>
              <span class="user-role">{{ firstRole() }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="auth.logout()" title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <div class="content-wrapper">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 244px;
      background: linear-gradient(180deg, #171443 0%, var(--primary-dark) 38%, var(--primary) 100%);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.26s var(--ease-in-out);
      position: sticky;
      top: 0;
      height: 100vh;
      z-index: 20;
    }

    .layout.sidebar-collapsed .sidebar { width: 68px; }
    .layout.sidebar-collapsed .logo-text,
    .layout.sidebar-collapsed .nav-item span,
    .layout.sidebar-collapsed .user-details { display: none; }
    .layout.sidebar-collapsed .user-info { justify-content: center; }

    .sidebar-header {
      padding: 22px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;

      &-text {
        color: white;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        white-space: nowrap;
      }
    }

    .collapse-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 9px;
      color: rgba(255,255,255,0.75);
      cursor: pointer;
      padding: 6px;
      display: inline-flex;
      transition: background-color 0.18s var(--ease), transform 0.16s var(--ease-out);
      flex-shrink: 0;
      &:hover { background: rgba(255,255,255,0.2); }
      &:active { transform: scale(0.94); }
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      color: rgba(255,255,255,0.68);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
      transition: background-color 0.18s var(--ease), color 0.18s var(--ease);

      &::before {
        content: '';
        position: absolute;
        left: 4px;
        top: 50%;
        width: 3px;
        height: 0;
        border-radius: 3px;
        background: #818cf8;
        transform: translateY(-50%);
        transition: height 0.22s var(--ease-out);
      }

      &:hover { background: rgba(255,255,255,0.1); color: white; }
      &.active {
        background: rgba(255,255,255,0.16);
        color: white;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
      }
      &.active::before { height: 18px; }
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #818cf8, var(--primary-dark));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      color: white;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      color: white;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      color: rgba(255,255,255,0.5);
      font-size: 0.72rem;
      text-transform: capitalize;
    }

    .logout-btn {
      background: rgba(255,255,255,0.08);
      border: none;
      border-radius: 9px;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      padding: 8px;
      display: inline-flex;
      transition: background-color 0.18s var(--ease), color 0.18s var(--ease), transform 0.16s var(--ease-out);
      flex-shrink: 0;
      &:hover { background: rgba(220,38,38,0.3); color: #fca5a5; }
      &:active { transform: scale(0.94); }
    }

    .main-content {
      flex: 1;
      overflow: auto;
      background: var(--surface);
    }

    .main-content::-webkit-scrollbar { width: 10px; height: 10px; }
    .main-content::-webkit-scrollbar-track { background: transparent; }
    .main-content::-webkit-scrollbar-thumb {
      background: rgba(79,70,229,0.18);
      border-radius: 100px;
      border: 3px solid var(--surface);
    }
    .main-content::-webkit-scrollbar-thumb:hover { background: rgba(79,70,229,0.34); }

    .content-wrapper {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px;
      animation: contentIn 0.32s var(--ease-out);
    }

    @keyframes contentIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .content-wrapper { padding: 16px; }
      .sidebar { width: 68px; }
      .logo-text, .nav-item span, .user-details { display: none; }
    }
  `]
})
export class LayoutComponent {
  collapsed = signal(false);

  constructor(public auth: AuthService) {}

  userInitial(): string {
    return this.auth.currentUser()?.nombre?.charAt(0)?.toUpperCase() || 'U';
  }

  firstRole(): string {
    return this.auth.currentUser()?.roles?.[0] || '';
  }
}
