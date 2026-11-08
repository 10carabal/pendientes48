import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
// Rutas profundas de `@ionic/angular` (no el barril) en el grafo inicial: el
// barril dejaba vivo el re-export `ToastController` y arrastraba `ion-toast`
// (~33 kB) al chunk inicial (presupuesto de 550 kB, tarea 5.3).
import { provideIonicAngular } from '@ionic/angular/provide';
import { provideServiceWorker } from '@angular/service-worker';
import { isNative } from '@platform/plataforma';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideIonicAngular({ mode: 'ios' }),
    provideServiceWorker('ngsw-worker.js', {
      // Solo en la PWA: en Android los archivos ya vienen dentro del APK.
      enabled: !isDevMode() && !isNative(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
