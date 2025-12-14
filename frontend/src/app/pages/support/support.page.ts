import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { SupportApiService } from '../../core/services/support-api.service';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeClient } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

type StripeDonationClient = StripeClient & {
  redirectToCheckout: (options: {
    sessionId: string;
  }) => Promise<{ error?: { message?: string } | undefined }>;
};

@Component({
  selector: 'app-support-page',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPage {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private donations = inject(SupportApiService);
  private translate = inject(TranslateService);
  private messages = inject(MessageService);

  private stripePromise: Promise<StripeDonationClient | null> =
    environment.stripePublishableKey
      ? (loadStripe(
          environment.stripePublishableKey,
        ) as Promise<StripeDonationClient | null>)
      : Promise.resolve(null);

  readonly CONSTANTS = CONSTANTS;
  readonly supportEmail = 'redacted@example.invalid';
  readonly minAmount = 5;
  readonly presetAmounts = signal([10, 25, 50, 100]);
  readonly currencySymbol = computed(() => '€');
  readonly processing = signal(false);
  readonly form = this.fb.nonNullable.group({
    amount: this.fb.nonNullable.control(25, {
      validators: [Validators.required, Validators.min(this.minAmount)],
    }),
    message: this.fb.control<string | null>(null),
  });
  readonly reasons = signal([
    CONSTANTS.SUPPORT_REASON_PRESERVE,
    CONSTANTS.SUPPORT_REASON_FUTURE,
    CONSTANTS.SUPPORT_REASON_COMMUNITY,
  ]);

  constructor() {
    this.handleStatus(this.route.snapshot.queryParamMap.get('status'));
  }

  selectPreset(amount: number) {
    this.form.controls.amount.setValue(amount);
  }

  showAmountError() {
    const ctrl = this.form.controls.amount;
    return ctrl.touched && ctrl.invalid;
  }

  async donate() {
    if (this.processing()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!environment.stripePublishableKey) {
      this.messages.add({
        severity: 'error',
        summary: this.translate.instant(CONSTANTS.SUPPORT_DONATION_ERROR),
        detail: this.translate.instant(CONSTANTS.SUPPORT_STRIPE_MISSING),
      });
      return;
    }

    this.processing.set(true);
    try {
      const { amount, message } = this.form.getRawValue();
      const session = await firstValueFrom(
        this.donations.createDonationCheckoutSession({
          amount,
          currency: 'EUR',
          provider: 'stripe',
          successUrl: this.buildStatusUrl('success'),
          cancelUrl: this.buildStatusUrl('canceled'),
          note: message,
        }),
      );
      const stripe = await this.stripePromise;
      if (!stripe) {
        throw new Error('Stripe could not be initialized.');
      }
      const result = await stripe.redirectToCheckout({
        sessionId: session.sessionId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Stripe redirect failed.');
      }
    } catch (err) {
      this.messages.add({
        severity: 'error',
        summary: this.translate.instant(CONSTANTS.SUPPORT_DONATION_ERROR),
        detail:
          (err as { message?: string })?.message ??
          this.translate.instant(CONSTANTS.SUPPORT_DONATION_ERROR),
      });
    } finally {
      this.processing.set(false);
    }
  }

  openDonationEmail() {
    window.open(
      `mailto:${this.supportEmail}?subject=Rodostoria%20Support`,
      '_self',
    );
  }

  private buildStatusUrl(status: 'success' | 'canceled') {
    const base = window.location.origin;
    const params = new URLSearchParams({
      status,
    });
    return `${base}${CONSTANTS.ROUTES.SUPPORT}?${params.toString()}`;
  }

  private handleStatus(status: string | null) {
    if (status === 'success') {
      this.messages.add({
        severity: 'success',
        summary: this.translate.instant(CONSTANTS.SUPPORT_DONATION_SUCCESS),
        detail: this.translate.instant(CONSTANTS.SUPPORT_THANK_YOU),
      });
      return;
    }

    if (status === 'canceled') {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant(CONSTANTS.SUPPORT_DONATION_CANCELED),
        detail: this.translate.instant(CONSTANTS.SUPPORT_DONATION_RETRY),
      });
    }
  }
}
