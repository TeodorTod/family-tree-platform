import { Injectable, Signal, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Lang } from '../../app/shared/types/lang.type';
import { AuthService } from '../../app/features/auth/services/auth.service';
import { take } from 'rxjs';
import { PlatformStorageService } from '../../app/core/services/platform-storage.service';

const FALLBACK: Lang = 'bg';
const SUPPORTED_LANGS: readonly Lang[] = ['bg', 'en'];
const NATIVE_LABELS: Record<Lang, string> = {
  bg: 'Български',
  en: 'English',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private t = inject(TranslateService);
  private auth = inject(AuthService, { optional: true });
  private storage = inject(PlatformStorageService);
  private currentLangSignal = signal<Lang>(FALLBACK);

  init() {
    const saved = (this.storage.getItem('lang') as Lang | null) || FALLBACK;
    const initial: Lang =
      saved && SUPPORTED_LANGS.includes(saved) ? saved : FALLBACK;

    this.t.addLangs([...SUPPORTED_LANGS]);
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
  }

  current(): Lang {
    const c = this.currentLangSignal();
    return SUPPORTED_LANGS.includes(c) ? c : FALLBACK;
  }

  currentSignal(): Signal<Lang> {
    return this.currentLangSignal.asReadonly();
  }

  availableLanguages(): Lang[] {
    return [...SUPPORTED_LANGS];
  }

  nativeLabel(lang: Lang): string {
    return NATIVE_LABELS[lang] ?? lang;
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
