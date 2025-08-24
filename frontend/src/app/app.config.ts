import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  provideHttpClient,
  HttpBackend,
  withInterceptorsFromDi,
  withInterceptors,
  HTTP_INTERCEPTORS,
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
import MyPreset from '../theme/mypreset';
import { AuthInterceptor } from './features/auth/interceptors/auth.interceptor';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
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
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    ConfirmationService,
    MessageService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
};
