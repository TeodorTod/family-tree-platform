import { TranslateService } from '@ngx-translate/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

export function HttpLoaderFactory(handler: HttpBackend): TranslateHttpLoader {
  const httpClient = new HttpClient(handler);
  return new TranslateHttpLoader(httpClient, 'assets/i18n/', '.json');
}

export function appInitializerFactory(
  translate: TranslateService
): () => Promise<void> {
  return () => firstValueFrom(translate.use('bg')).then(() => void 0);
} 