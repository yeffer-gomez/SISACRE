import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRoles: string[] = route.data['roles'] || [];

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const userRoles = auth.currentUser()?.roles || [];
  const hasRole = requiredRoles.some(r => userRoles.includes(r));

  if (!hasRole) {
    router.navigate(['/']);
    return false;
  }
  return true;
};
