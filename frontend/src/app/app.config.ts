import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  provideHttpClient,
  HttpBackend,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  TranslateLoader,
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  HttpLoaderFactory,
  appInitializerFactory,
} from './shared/utils/translations.utils';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    provideHttpClient(withInterceptorsFromDi()),
    ...(TranslateModule.forRoot({
      defaultLanguage: 'bg',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend],
      },
    }).providers ?? []),

    provideAppInitializer(() =>
      appInitializerFactory(inject(TranslateService))()
    ),
  ],
};
