import { TranslateService } from '@ngx-translate/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';
import { Lang } from '../types/lang.type';

const SUPPORTED: Lang[] = ['bg', 'en'];
const FALLBACK: Lang = 'bg';

export function HttpLoaderFactory(handler: HttpBackend): TranslateHttpLoader {
  const httpClient = new HttpClient(handler);
  return new TranslateHttpLoader(httpClient, 'assets/i18n/', '.json');
}

export function appInitializerFactory(
  translate: TranslateService
): () => Promise<void> {
  return () => {
    const stored =
      typeof window !== 'undefined'
        ? (localStorage.getItem('lang') as Lang | null)
        : null;
    const current = translate.currentLang as Lang | undefined;
    const lang = (SUPPORTED.includes(current as Lang)
      ? current
      : stored && SUPPORTED.includes(stored)
      ? stored
      : FALLBACK) as Lang;

    return firstValueFrom(translate.use(lang)).then(() => void 0);
  };
}
