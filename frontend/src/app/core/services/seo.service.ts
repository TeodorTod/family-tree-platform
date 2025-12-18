import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

type SeoKey =
  | 'SEO.TITLE'
  | 'SEO.DESCRIPTION'
  | 'SEO.SHARE_TITLE'
  | 'SEO.SHARE_DESCRIPTION'
  | 'SEO.APP_NAME';

const SEO_KEYS: SeoKey[] = [
  'SEO.TITLE',
  'SEO.DESCRIPTION',
  'SEO.SHARE_TITLE',
  'SEO.SHARE_DESCRIPTION',
  'SEO.APP_NAME',
];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  init(): void {
    this.translate
      .stream(SEO_KEYS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((translations) => this.applySeoTags(translations));
  }

  private applySeoTags(translations: Record<SeoKey, string>): void {
    const title = translations['SEO.TITLE'] ?? 'Rodostoria';
    const description =
      translations['SEO.DESCRIPTION'] ??
      'Rodostoria helps families preserve their history.';
    const shareTitle = translations['SEO.SHARE_TITLE'] ?? title;
    const shareDescription =
      translations['SEO.SHARE_DESCRIPTION'] ?? description;
    const appName = translations['SEO.APP_NAME'] ?? 'Rodostoria';

    this.title.setTitle(title);
    this.meta.updateTag(
      { name: 'description', content: description },
      "name='description'"
    );
    this.meta.updateTag(
      { property: 'og:title', content: shareTitle },
      "property='og:title'"
    );
    this.meta.updateTag(
      { property: 'og:description', content: shareDescription },
      "property='og:description'"
    );
    this.meta.updateTag(
      { name: 'twitter:title', content: shareTitle },
      "name='twitter:title'"
    );
    this.meta.updateTag(
      { name: 'twitter:description', content: shareDescription },
      "name='twitter:description'"
    );

    this.updateStructuredData(appName, description);
  }

  private updateStructuredData(appName: string, description: string): void {
    const script = this.document.getElementById(
      'app-structured-data'
    ) as HTMLScriptElement | null;

    if (!script) {
      return;
    }

    const schema = {
      '@context': 'https://example.invalid',
      '@type': 'SoftwareApplication',
      name: appName,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      url: 'https://example.invalid',
      description,
    };

    script.textContent = JSON.stringify(schema);
  }
}
