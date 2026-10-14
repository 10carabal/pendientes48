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
  ...rutasDesarrollo,
  { path: '**', redirectTo: '' },
];
