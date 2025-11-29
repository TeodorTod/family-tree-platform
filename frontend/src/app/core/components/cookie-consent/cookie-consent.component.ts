import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { CookieConsentService } from '../../services/cookie-consent.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, TranslateModule],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentComponent {
  private consent = inject(CookieConsentService);
  private auth = inject(AuthService);
  private token = this.auth.getTokenSignal();

  readonly visible = computed(
    () => !!this.token() && !this.consent.hasConsent(),
  );
  readonly showPreferences = signal(false);
  readonly analytics = signal(true);
  readonly marketing = signal(false);

  togglePreferences() {
    this.showPreferences.update((value) => !value);
  }

  acceptAll() {
    this.consent.accept({ analytics: true, marketing: true });
  }

  acceptEssential() {
    this.consent.accept({ analytics: false, marketing: false });
  }

  savePreferences() {
    this.consent.accept({
      analytics: this.analytics(),
      marketing: this.marketing(),
    });
  }

  updateAnalytics(value: boolean) {
    this.analytics.set(value);
  }

  updateMarketing(value: boolean) {
    this.marketing.set(value);
  }
}
