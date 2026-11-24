import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'documentos',
        loadComponent: () => import('./modules/documents/document-list/document-list.component').then(m => m.DocumentListComponent)
      },
      {
        path: 'documentos/nuevo',
        loadComponent: () => import('./modules/documents/document-form/document-form.component').then(m => m.DocumentFormComponent)
      },
      {
        path: 'documentos/:id',
        loadComponent: () => import('./modules/documents/document-detail/document-detail.component').then(m => m.DocumentDetailComponent)
      },
      {
        path: 'proyectos',
        loadComponent: () => import('./modules/projects/project-list/project-list.component').then(m => m.ProjectListComponent)
      },
      {
        path: 'proyectos/nuevo',
        loadComponent: () => import('./modules/projects/project-form/project-form.component').then(m => m.ProjectFormComponent)
      },
      {
        path: 'proyectos/:id',
        loadComponent: () => import('./modules/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
      },
      {
        path: 'proyectos/:id/editar',
        loadComponent: () => import('./modules/projects/project-form/project-form.component').then(m => m.ProjectFormComponent)
      },
      {
        path: 'docentes/estadisticas',
        loadComponent: () => import('./modules/docentes/docente-dashboard/docente-dashboard.component').then(m => m.DocenteDashboardComponent)
      },
      {
        path: 'docentes/nuevo',
        loadComponent: () => import('./modules/docentes/docente-form/docente-form.component').then(m => m.DocenteFormComponent)
      },
      {
        path: 'docentes',
        loadComponent: () => import('./modules/docentes/docente-list/docente-list.component').then(m => m.DocenteListComponent)
      },
      {
        path: 'docentes/:id/editar',
        loadComponent: () => import('./modules/docentes/docente-form/docente-form.component').then(m => m.DocenteFormComponent)
      },
      {
        path: 'docentes/:id',
        loadComponent: () => import('./modules/docentes/docente-detail/docente-detail.component').then(m => m.DocenteDetailComponent)
      },
      {
        path: 'egresados/estadisticas',
        loadComponent: () => import('./modules/egresados/egresado-dashboard/egresado-dashboard.component').then(m => m.EgresadoDashboardComponent)
      },
      {
        path: 'egresados/catalogo/:dominio',
        loadComponent: () => import('./modules/egresados/egresado-catalogo/egresado-catalogo.component').then(m => m.EgresadoCatalogoComponent)
      },
      {
        path: 'egresados/nuevo',
        loadComponent: () => import('./modules/egresados/egresado-form/egresado-form.component').then(m => m.EgresadoFormComponent)
      },
      {
        path: 'egresados',
        loadComponent: () => import('./modules/egresados/egresado-list/egresado-list.component').then(m => m.EgresadoListComponent)
      },
      {
        path: 'egresados/:id/editar',
        loadComponent: () => import('./modules/egresados/egresado-form/egresado-form.component').then(m => m.EgresadoFormComponent)
      },
      {
        path: 'egresados/:id',
        loadComponent: () => import('./modules/egresados/egresado-detail/egresado-detail.component').then(m => m.EgresadoDetailComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
        loadComponent: () => import('./modules/users/user-list/user-list.component').then(m => m.UserListComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
