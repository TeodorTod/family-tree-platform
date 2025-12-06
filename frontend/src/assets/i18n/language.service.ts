import { Injectable, Signal, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PRIME_NG_CONFIG } from 'primeng/config';
import { PRIMENG_BG } from '../../assets/i18n/primeng-bg';
import { PRIMENG_EN } from '../../assets/i18n/primeng-en';
import { Lang } from '../../app/shared/types/lang.type';
import { AuthService } from '../../app/features/auth/services/auth.service';
import { take } from 'rxjs';
import { PlatformStorageService } from '../../app/core/services/platform-storage.service';

const FALLBACK: Lang = 'bg';

const PRIMENG_MAP: Record<Lang, any> = {
  bg: PRIMENG_BG,
  en: PRIMENG_EN,
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private t = inject(TranslateService);
  private primeng = inject(PRIME_NG_CONFIG);
  private auth = inject(AuthService, { optional: true });
  private storage = inject(PlatformStorageService);
  private currentLangSignal = signal<Lang>(FALLBACK);

  init() {
    const saved = (this.storage.getItem('lang') as Lang | null) || FALLBACK;
    const initial: Lang = (['bg', 'en'] as Lang[]).includes(saved) ? saved : FALLBACK;

    this.t.addLangs(['bg', 'en']);
    this.t.setDefaultLang(FALLBACK);
    this.use(initial);
    this.trySyncFromServer();
  }

  use(lang: Lang) {
    // ngx-translate
    this.t.use(lang);
    this.storage.setItem('lang', lang);
    document.documentElement.lang = lang;
    this.currentLangSignal.set(lang);

    // PrimeNG
    this.primeng.translation = PRIMENG_MAP[lang];
  }

  current(): Lang {
    const c = this.currentLangSignal();
    return (['bg', 'en'] as Lang[]).includes(c) ? c : FALLBACK;
  }

  currentSignal(): Signal<Lang> {
    return this.currentLangSignal.asReadonly();
  }

  private trySyncFromServer() {
    const current = this.current();
    if (!this.auth || !this.auth.getTokenValue()) {
      return;
    }

    this.auth
      .getProfile()
      .pipe(take(1))
      .subscribe({
        next: (user) => {
          const lang = (user?.language as Lang) || current;
          if (lang && lang !== current) {
            this.use(lang);
          }
        },
        error: () => void 0,
      });
  }
}
