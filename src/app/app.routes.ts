import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

// La guía de estilo existe solo en desarrollo: en producción esta ruta no
// existe y el wildcard la redirige a inicio.
const rutasDesarrollo: Routes = isDevMode()
  ? [
      {
        path: 'guia',
        loadComponent: () => import('./features/guia/guia').then((m) => m.Guia),
      },
    ]
  : [];

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio) },
  {
    path: 'pacientes',
    loadComponent: () => import('./features/pacientes/pacientes').then((m) => m.Pacientes),
  },
  {
    // Guía de la farmacia (tarea 3.3): un solo toque desde el inicio.
    path: 'ventanilla',
    loadComponent: () => import('./features/ventanilla/ventanilla').then((m) => m.Ventanilla),
  },
  {
    // Estáticas antes de cualquier ruta con parámetro: `pendientes/nuevo` debe
    // declararse antes que `pendientes/:id` (el detalle llega con la tarea 3.5).
    path: 'pendientes/nuevo',
    loadComponent: () =>
      import('./features/pendiente-form/pendiente-form').then((m) => m.PendienteForm),
  },
  {
    path: 'pendientes/:id/editar',
    loadComponent: () =>
      import('./features/pendiente-form/pendiente-form').then((m) => m.PendienteForm),
  },
  ...rutasDesarrollo,
  { path: '**', redirectTo: '' },
];
