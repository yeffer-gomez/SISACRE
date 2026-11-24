import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <div class="brand-logo">
            <svg width="52" height="80" viewBox="0 0 400 520" fill="none">
              <defs>
                <clipPath id="ltc"><rect x="0" y="0" width="400" height="260"/></clipPath>
                <clipPath id="lbc"><rect x="0" y="260" width="400" height="270"/></clipPath>
              </defs>
              <path d="M 48,68 L 148,68 C 148,68 118,138 118,260 C 50,242 16,178 16,260 C 16,168 16,128 48,68 Z" fill="rgba(255,255,255,0.95)" clip-path="url(#ltc)"/>
              <path d="M 48,452 L 148,452 C 148,452 118,382 118,260 C 50,278 16,342 16,260 C 16,352 16,392 48,452 Z" fill="rgba(255,255,255,0.65)" clip-path="url(#lbc)"/>
              <path d="M 352,68 L 252,68 C 252,68 282,138 282,260 C 350,242 384,178 384,260 C 384,168 384,128 352,68 Z" fill="rgba(255,255,255,0.95)" clip-path="url(#ltc)"/>
              <path d="M 352,452 L 252,452 C 252,452 282,382 282,260 C 350,278 384,342 384,260 C 384,352 384,392 352,452 Z" fill="rgba(255,255,255,0.65)" clip-path="url(#lbc)"/>
            </svg>
          </div>
          <div>
            <h1>SISACRE</h1>
            <p>Departamento de Psicología</p>
            <p class="brand-univ">Universidad de Nariño</p>
          </div>
        </div>

        <div class="login-form-area">
          <h2>Iniciar sesión</h2>
          <p class="subtitle">Ingresa con tu correo institucional</p>

          @if (error()) {
            <div class="alert alert-danger">{{ error() }}</div>
          }

          <form (ngSubmit)="onLogin()">
            <div class="form-group">
              <label>Correo institucional <span class="required">*</span></label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="correo"
                name="correo"
                placeholder="usuario&#64;udenar.edu.co"
                required
              />
            </div>

            <div class="form-group">
              <label>Contraseña <span class="required">*</span></label>
              <div class="password-wrapper">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  required
                />
                <button type="button" class="toggle-pw" (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Ingresando...
              } @else {
                Ingresar al Sistema
              }
            </button>
          </form>

          <div class="login-footer">
            <p class="text-muted text-sm">Universidad de Nariño · Programa de Psicología</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f0c3a 0%, var(--primary-dark) 44%, var(--primary) 80%, var(--accent-light) 100%);
      padding: 24px;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle at 18% 82%, rgba(129,140,248,0.28) 0%, transparent 50%),
                          radial-gradient(circle at 82% 15%, rgba(167,139,250,0.2) 0%, transparent 45%);
      }
    }

    .login-card {
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-lg);
      border: 1px solid rgba(255,255,255,0.5);
      overflow: hidden;
      position: relative;
      animation: loginCardIn 0.42s var(--ease-out);
    }

    @keyframes loginCardIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .login-brand {
      background: linear-gradient(135deg, #171443 0%, var(--primary-dark) 55%, var(--primary) 100%);
      padding: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      color: white;

      h1 {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1.625rem;
        font-weight: 700;
        color: white;
        letter-spacing: -0.01em;
        line-height: 1.1;
        margin-bottom: 4px;
      }
      p { font-size: 0.875rem; opacity: 0.85; margin-top: 2px; }
      .brand-univ { font-size: 0.75rem; opacity: 0.6; margin-top: 2px; }
    }

    .brand-logo {
      flex-shrink: 0;
    }

    .login-form-area {
      padding: 32px;

      h2 {
        font-size: 1.375rem;
        margin-bottom: 4px;
        color: var(--text-primary);
      }
      .subtitle {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 24px;
      }

      form { display: flex; flex-direction: column; gap: 20px; }
    }

    .password-wrapper {
      position: relative;
      .form-control { padding-right: 44px; }
    }
    .toggle-pw {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 6px;
      border-radius: 8px;
      line-height: 1;
      transition: background-color 0.16s var(--ease), transform 0.16s var(--ease-out);
      &:hover { background: var(--surface-sunken); }
      &:active { transform: translateY(-50%) scale(0.92); }
    }

    .w-full { width: 100%; justify-content: center; }

    .login-footer {
      margin-top: 24px;
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
    }

    .alert { margin-bottom: 8px; }
  `]
})
export class LoginComponent {
  correo = '';
  password = '';
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    if (!this.correo || !this.password) {
      this.error.set('Por favor ingresa correo y contraseña');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.correo, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err.error?.message || 'Error al iniciar sesión');
        this.loading.set(false);
      }
    });
  }
}
