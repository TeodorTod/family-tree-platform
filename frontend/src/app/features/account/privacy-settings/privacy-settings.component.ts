import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import {
  SharingApiService,
  UpdateUserSettingsDto,
} from '../../../core/services/sharing-api.service';
import {
  CookieConsentPreferences,
  CookieConsentService,
} from '../../../core/services/cookie-consent.service';
import { TranslateService } from '@ngx-translate/core';

type PrivacyDefaultsFormValue = {
  allowDeceasedDiscoveryDefault: boolean;
  allowDeceasedDetailsDefault: boolean;
};

type CookieFormValue = CookieConsentPreferences;

@Component({
  selector: 'app-privacy-settings',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './privacy-settings.component.html',
  styleUrls: ['./privacy-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'privacy-settings-page',
  },
})
export class PrivacySettingsComponent {
  readonly CONSTANTS = CONSTANTS;
  readonly routes = CONSTANTS.ROUTES;
  readonly supportEmail = 'redacted@example.invalid';
  readonly supportEmailHref = `mailto:${this.supportEmail}`;

  private sharing = inject(SharingApiService);
  private consent = inject(CookieConsentService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  readonly privacyValue = signal<PrivacyDefaultsFormValue>({
    allowDeceasedDiscoveryDefault: false,
    allowDeceasedDetailsDefault: false,
  });
  readonly cookieValue = signal<CookieFormValue>({
    analytics: true,
    marketing: false,
  });
  private readonly initialDefaults = signal<PrivacyDefaultsFormValue | null>(
    null,
  );
  private readonly initialCookie = signal<CookieFormValue | null>(null);

  readonly loadingDefaults = signal(true);
  readonly savingDefaults = signal(false);
  readonly defaultsMessage = signal<
    { severity: 'success' | 'error'; text: string } | null
  >(null);

  readonly cookieSaving = signal(false);
  readonly cookieMessage = signal<
    { severity: 'success' | 'error'; text: string } | null
  >(null);

  readonly defaultsDirty = computed(() => {
    const initial = this.initialDefaults();
    if (!initial) {
      return false;
    }
    const current = this.privacyValue();
    return (
      initial.allowDeceasedDiscoveryDefault !==
        current.allowDeceasedDiscoveryDefault ||
      initial.allowDeceasedDetailsDefault !==
        current.allowDeceasedDetailsDefault
    );
  });

  readonly cookieDirty = computed(() => {
    const initial = this.initialCookie();
    if (!initial) {
      return true;
    }
    const current = this.cookieValue();
    return (
      initial.analytics !== current.analytics ||
      initial.marketing !== current.marketing
    );
  });

  readonly cookieLastUpdated = computed(
    () => this.consent.consent()?.acceptedAt ?? null,
  );
  readonly hasCookieConsent = this.consent.hasConsent;

  readonly resourceLinks = [
    {
      labelKey: CONSTANTS.PRIVACY_SHORTCUTS_POLICY,
      route: CONSTANTS.ROUTES.LEGAL.PRIVACY,
      kind: 'privacy' as const,
      icon: 'pi-shield',
    },
    {
      labelKey: CONSTANTS.PRIVACY_SHORTCUTS_COOKIES,
      route: CONSTANTS.ROUTES.LEGAL.COOKIES,
      kind: 'cookies' as const,
      icon: 'pi-cookie',
    },
    {
      labelKey: CONSTANTS.PRIVACY_SHORTCUTS_SHARING,
      route: CONSTANTS.ROUTES.SETTINGS.SHARING,
      kind: 'sharing' as const,
      icon: 'pi-share-alt',
    },
  ] as const;

  constructor() {
    effect(() => {
      const state = this.consent.consent();
      if (!state) {
        this.initialCookie.set(null);
        return;
      }
      const preferences: CookieFormValue = {
        analytics: !!state.analytics,
        marketing: !!state.marketing,
      };
      this.initialCookie.set(preferences);
      this.cookieValue.set(preferences);
    });

    this.loadPrivacyDefaults();
  }

  updatePrivacyDefaults(
    key: keyof PrivacyDefaultsFormValue,
    value: boolean,
  ) {
    this.privacyValue.update((current) => ({
      ...current,
      [key]: value,
    }) as PrivacyDefaultsFormValue);
    this.defaultsMessage.set(null);
  }

  updateCookiePreferences(key: keyof CookieFormValue, value: boolean) {
    this.cookieValue.update((current) => ({
      ...current,
      [key]: value,
    }) as CookieFormValue);
    this.cookieMessage.set(null);
  }

  savePrivacyDefaults() {
    if (this.savingDefaults() || !this.defaultsDirty()) {
      return;
    }
    const payload = this.privacyValue();
    this.savingDefaults.set(true);
    this.defaultsMessage.set(null);

    this.sharing
      .updateMySettings(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          const normalized = this.normalizeDefaults(settings);
          this.initialDefaults.set(normalized);
          this.privacyValue.set(normalized);
          this.savingDefaults.set(false);
          this.defaultsMessage.set({
            severity: 'success',
            text: this.translate.instant(CONSTANTS.PRIVACY_DEFAULTS_SUCCESS),
          });
        },
        error: () => {
          this.savingDefaults.set(false);
          this.defaultsMessage.set({
            severity: 'error',
            text: this.translate.instant(CONSTANTS.PRIVACY_DEFAULTS_ERROR),
          });
        },
      });
  }

  resetPrivacyDefaults() {
    const initial = this.initialDefaults();
    if (!initial) {
      return;
    }
    this.privacyValue.set(initial);
    this.defaultsMessage.set(null);
  }

  saveCookiePreferences() {
    if (this.cookieSaving() || (!this.cookieDirty() && this.hasCookieConsent())) {
      return;
    }
    this.cookieSaving.set(true);
    this.cookieMessage.set(null);

    try {
      const prefs = this.cookieValue();
      this.initialCookie.set(prefs);
      this.consent.accept(prefs);
      this.cookieMessage.set({
        severity: 'success',
        text: this.translate.instant(CONSTANTS.PRIVACY_COOKIES_SUCCESS),
      });
    } catch {
      this.cookieMessage.set({
        severity: 'error',
        text: this.translate.instant(CONSTANTS.PRIVACY_COOKIES_ERROR),
      });
    } finally {
      this.cookieSaving.set(false);
    }
  }

  private loadPrivacyDefaults() {
    this.loadingDefaults.set(true);
    this.defaultsMessage.set(null);

    this.sharing
      .getMySettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          const normalized = this.normalizeDefaults(settings);
          this.initialDefaults.set(normalized);
          this.privacyValue.set(normalized);
          this.loadingDefaults.set(false);
        },
        error: () => {
          this.loadingDefaults.set(false);
          this.defaultsMessage.set({
            severity: 'error',
            text: this.translate.instant(CONSTANTS.PRIVACY_DEFAULTS_ERROR),
          });
        },
      });
  }

  private normalizeDefaults(
    settings: UpdateUserSettingsDto | null,
  ): PrivacyDefaultsFormValue {
    return this.coercePrivacyFormValue(settings);
  }

  private coercePrivacyFormValue(
    value?: Partial<PrivacyDefaultsFormValue> | null,
  ): PrivacyDefaultsFormValue {
    return {
      allowDeceasedDiscoveryDefault: !!value?.allowDeceasedDiscoveryDefault,
      allowDeceasedDetailsDefault: !!value?.allowDeceasedDetailsDefault,
    };
  }

}
