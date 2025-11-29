import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CookieConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentState extends CookieConsentPreferences {
  acceptedAt: string;
}

const CONSENT_STORAGE_KEY = 'ft_cookie_consent_v1';

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService {
  private platformId = inject(PLATFORM_ID);
  private state = signal<CookieConsentState | null>(this.readPersistedConsent());

  readonly hasConsent = computed(() => this.state() !== null);
  readonly consent = computed(() => this.state());

  accept(preferences: CookieConsentPreferences) {
    const next: CookieConsentState = {
      ...preferences,
      acceptedAt: new Date().toISOString(),
    };
    this.state.set(next);
    this.persist(next);
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  private readPersistedConsent(): CookieConsentState | null {
    if (!this.isBrowser()) {
      return null;
    }
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as CookieConsentState;
      if (
        typeof parsed?.analytics === 'boolean' &&
        typeof parsed?.marketing === 'boolean' &&
        typeof parsed?.acceptedAt === 'string'
      ) {
        return parsed;
      }
      return null;
    } catch {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
  }

  private persist(value: CookieConsentState) {
    if (!this.isBrowser()) {
      return;
    }
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
  }
}
