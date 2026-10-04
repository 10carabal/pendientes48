import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideIonicAngular } from '@ionic/angular';
import { provideServiceWorker } from '@angular/service-worker';
import { isNative } from '@platform/plataforma';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideIonicAngular({}),
    provideServiceWorker('ngsw-worker.js', {
      // Solo en la PWA: en Android los archivos ya vienen dentro del APK.
      enabled: !isDevMode() && !isNative(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
