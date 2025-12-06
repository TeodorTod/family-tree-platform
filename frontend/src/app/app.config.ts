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
  withFetch,
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
import { LanguageService } from '../assets/i18n/language.service';
import { PRIMENG_BG } from '../assets/i18n/primeng-bg';
import { PrimeNgLanguageService } from './core/services/primeng-language.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
      },
      translation: PRIMENG_BG,
    }),

    ...(TranslateModule.forRoot({
      defaultLanguage: 'bg',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend],
      },
    }).providers ?? []),

    provideAppInitializer(() => {
      inject(LanguageService).init();
      inject(PrimeNgLanguageService);
      return appInitializerFactory(inject(TranslateService))();
    }),
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
