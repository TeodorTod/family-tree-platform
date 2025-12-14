import { Injectable, effect, inject } from '@angular/core';
import { PRIME_NG_CONFIG } from 'primeng/config';
import type { Translation } from 'primeng/api';
import { LanguageService } from '../../../assets/i18n/language.service';
import { PRIMENG_BG } from '../../../assets/i18n/primeng-bg';
import { PRIMENG_EN } from '../../../assets/i18n/primeng-en';
import { Lang } from '../../shared/types/lang.type';

const PRIMENG_MAP: Record<Lang, Partial<Translation>> = {
  bg: PRIMENG_BG,
  en: PRIMENG_EN,
};

@Injectable({ providedIn: 'root' })
export class PrimeNgLanguageService {
  private primeng = inject(PRIME_NG_CONFIG);
  private language = inject(LanguageService);
  private langSignal = this.language.currentSignal();

  constructor() {
    effect(() => {
      const lang = this.langSignal();
      const dict = PRIMENG_MAP[lang];
      if (!dict) {
        return;
      }
      this.applyTranslation(dict);
    });
  }

  private applyTranslation(dict: Partial<Translation>) {
    const config = this.primeng as {
      translation?: Translation;
      setTranslation?: (value: Partial<Translation>) => void;
    };
    const merged = { ...(config.translation ?? {}), ...dict };
    if (typeof config.setTranslation === 'function') {
      config.setTranslation(merged);
    } else {
      config.translation = merged;
    }
  }
}
