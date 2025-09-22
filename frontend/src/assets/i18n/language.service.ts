import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PRIME_NG_CONFIG } from 'primeng/config';
import { PRIMENG_BG } from '../../assets/i18n/primeng-bg';
import { PRIMENG_EN } from '../../assets/i18n/primeng-en';
import { Lang } from '../../app/shared/types/lang.type';

const FALLBACK: Lang = 'bg';

const PRIMENG_MAP: Record<Lang, any> = {
  bg: PRIMENG_BG,
  en: PRIMENG_EN,
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private t = inject(TranslateService);
  private primeng = inject(PRIME_NG_CONFIG);

  init() {
    const saved = (localStorage.getItem('lang') as Lang) || FALLBACK;
    const initial: Lang = (['bg', 'en'] as Lang[]).includes(saved) ? saved : FALLBACK;

    this.t.addLangs(['bg', 'en']);
    this.t.setDefaultLang(FALLBACK);
    this.use(initial);
  }

  use(lang: Lang) {
    // ngx-translate
    this.t.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    // PrimeNG
    this.primeng.translation = PRIMENG_MAP[lang];
  }

  current(): Lang {
    const c = (this.t.currentLang as Lang) || FALLBACK;
    return (['bg', 'en'] as Lang[]).includes(c) ? c : FALLBACK;
  }
}
