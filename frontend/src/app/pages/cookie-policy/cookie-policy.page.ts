import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';

type LegalSection = {
  TITLE?: string;
  PARAGRAPHS?: string[];
  BULLETS?: string[];
};

type CookieEntry = {
  NAME: string;
  PURPOSE: string;
  PROVIDER: string;
  DURATION: string;
};

type CookieContent = {
  TITLE?: string;
  UPDATED?: string;
  INTRO?: string;
  SECTIONS?: Record<string, LegalSection>;
  TABLE_HEADERS?: {
    NAME: string;
    PURPOSE: string;
    PROVIDER: string;
    DURATION: string;
  };
  COOKIE_TABLE?: CookieEntry[];
};

const SECTION_ORDER = [
  'OVERVIEW',
  'USAGE',
  'TYPES',
  'CONTROL',
  'THIRD_PARTY',
  'UPDATES',
] as const;

@Component({
  selector: 'app-cookie-policy',
  imports: [...SHARED_ANGULAR_IMPORTS],
  templateUrl: './cookie-policy.page.html',
  styleUrls: ['./cookie-policy.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'legal-page' },
})
export class CookiePolicyPage {
  private translate = inject(TranslateService);
  private title = inject(Title);

  private content = toSignal(
    this.translate.stream('LEGAL.COOKIES'),
    { initialValue: this.translate.instant('LEGAL.COOKIES') },
  );

  readonly header = computed(() => {
    const data = (this.content() ?? {}) as CookieContent;
    const pageTitle = data.TITLE ?? 'Cookie Policy';
    this.title.setTitle(`${pageTitle} • FamilyTree`);
    return {
      title: pageTitle,
      updated: data.UPDATED ?? '',
      intro: data.INTRO ?? '',
    };
  });

  readonly sections = computed(() => {
    const data = (this.content() ?? {}) as CookieContent;
    const sections = data.SECTIONS ?? {};
    return SECTION_ORDER.map((key) => ({
      key,
      title: sections[key]?.TITLE ?? '',
      paragraphs: sections[key]?.PARAGRAPHS ?? [],
      bullets: sections[key]?.BULLETS ?? [],
    }));
  });

  readonly tableHeaders = computed(() => {
    const data = (this.content() ?? {}) as CookieContent;
    const headers = data.TABLE_HEADERS ?? {
      NAME: 'Cookie',
      PURPOSE: 'Purpose',
      PROVIDER: 'Provider',
      DURATION: 'Duration',
    };
    return headers;
  });

  readonly cookieEntries = computed(() => {
    const data = (this.content() ?? {}) as CookieContent;
    return data.COOKIE_TABLE ?? [];
  });
}

