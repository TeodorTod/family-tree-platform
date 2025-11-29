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

type PrivacyContent = {
  TITLE?: string;
  UPDATED?: string;
  INTRO?: string;
  SECTIONS?: Record<string, LegalSection>;
};

const SECTION_ORDER = [
  'SUMMARY',
  'DATA_COLLECTION',
  'USE_OF_DATA',
  'LEGAL_BASES',
  'DATA_SHARING',
  'LIVING_RELATIVES',
  'SECURITY_RETENTION',
  'YOUR_RIGHTS',
  'CONTACT',
] as const;

@Component({
  selector: 'app-privacy-policy',
  imports: [...SHARED_ANGULAR_IMPORTS],
  templateUrl: './privacy-policy.page.html',
  styleUrls: ['./privacy-policy.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'legal-page' },
})
export class PrivacyPolicyPage {
  private translate = inject(TranslateService);
  private title = inject(Title);

  private content = toSignal(
    this.translate.stream('LEGAL.PRIVACY'),
    { initialValue: this.translate.instant('LEGAL.PRIVACY') },
  );

  readonly header = computed(() => {
    const data = (this.content() ?? {}) as PrivacyContent;
    const pageTitle = data.TITLE ?? 'Privacy Policy';
    this.title.setTitle(`${pageTitle} • FamilyTree`);
    return {
      title: pageTitle,
      updated: data.UPDATED ?? '',
      intro: data.INTRO ?? '',
    };
  });

  readonly sections = computed(() => {
    const data = (this.content() ?? {}) as PrivacyContent;
    const sections = data.SECTIONS ?? {};
    return SECTION_ORDER.map((key) => ({
      key,
      title: sections[key]?.TITLE ?? '',
      paragraphs: sections[key]?.PARAGRAPHS ?? [],
      bullets: sections[key]?.BULLETS ?? [],
    }));
  });
}

