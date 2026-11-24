import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  usuario = signal<Usuario | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): Usuario | null {
    const stored = localStorage.getItem('sisacre_user');
    return stored ? JSON.parse(stored) : null;
  }

  login(correo: string, password: string) {
    return this.http.post<{ token: string; usuario: Usuario }>(`${this.API}/auth/login`, { correo, password }).pipe(
      tap(res => {
        localStorage.setItem('sisacre_token', res.token);
        localStorage.setItem('sisacre_user', JSON.stringify(res.usuario));
        this.usuario.set(res.usuario);
      })
    );
  }

  logout() {
    localStorage.removeItem('sisacre_token');
    localStorage.removeItem('sisacre_user');
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('sisacre_token');
  }

  currentUser(): Usuario | null {
    return this.usuario();
  }

  hasRole(role: string): boolean {
    return this.usuario()?.roles?.includes(role) ?? false;
  }
}
