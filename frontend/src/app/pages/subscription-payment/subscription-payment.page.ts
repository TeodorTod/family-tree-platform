import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { SUBSCRIPTION_PLAN_OPTION_MAP } from '../../shared/constants/subscription-plan-options';
import {
  SubscriptionPlanCode,
  SubscriptionPlanOption,
} from '../../shared/types/subscription-plan.type';
import { TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../features/account/services/account.service';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../features/auth/services/auth.service';
import { firstValueFrom } from 'rxjs';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeClient } from '@stripe/stripe-js';

type StripeCheckoutClient = StripeClient & {
  redirectToCheckout: (options: {
    sessionId: string;
  }) => Promise<{ error?: { message?: string } | undefined }>;
};
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription-payment',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './subscription-payment.page.html',
  styleUrls: ['./subscription-payment.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPaymentPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private account = inject(AccountService);
  private messages = inject(MessageService);
  private auth = inject(AuthService);
  private stripePromise: Promise<StripeCheckoutClient | null> =
    environment.stripePublishableKey
      ? (loadStripe(
          environment.stripePublishableKey,
        ) as Promise<StripeCheckoutClient | null>)
      : Promise.resolve(null);

  readonly CONSTANTS = CONSTANTS;
  readonly currencySymbol = computed(() =>
    this.translate.instant(CONSTANTS.COMMON_CURRENCY_EUR),
  );
  readonly processing = signal(false);
  readonly planCode = signal<SubscriptionPlanCode | null>(null);
  readonly plan = computed<SubscriptionPlanOption | null>(() => {
    const code = this.planCode();
    return code ? SUBSCRIPTION_PLAN_OPTION_MAP.get(code) ?? null : null;
  });
  readonly returnUrl = signal<string>(
    CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION_PLANS,
  );

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const planParam = params.get('plan') as SubscriptionPlanCode | null;
    const returnParam = params.get('returnUrl');
    const status = params.get('status');

    if (planParam && SUBSCRIPTION_PLAN_OPTION_MAP.has(planParam)) {
      this.planCode.set(planParam);
    } else {
      this.navigateToPlans();
      return;
    }

    if (returnParam && returnParam.startsWith('/')) {
      this.returnUrl.set(returnParam);
    }

    this.handleStatus(status);
  }

  get planTitle() {
    const plan = this.plan();
    return plan ? this.translate.instant(plan.titleKey) : '';
  }

  perDay(plan: SubscriptionPlanOption) {
    return (plan.priceEur / plan.durationDays).toFixed(2);
  }

  async completePayment() {
    const plan = this.plan();
    if (!plan) {
      this.navigateToPlans();
      return;
    }

    if (!environment.stripePublishableKey) {
      this.messages.add({
        severity: 'error',
        summary: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_ERROR,
        ),
        detail: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_NOT_CONFIGURED,
        ),
      });
      return;
    }

    this.processing.set(true);
    try {
      const session = await firstValueFrom(
        this.account.createSubscriptionCheckoutSession({
          plan: plan.code,
          successUrl: this.buildStatusUrl(plan.code, 'success'),
          cancelUrl: this.buildStatusUrl(plan.code, 'canceled'),
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
        summary: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_ERROR,
        ),
        detail:
          (err as { message?: string })?.message ??
          this.translate.instant(CONSTANTS.SUBSCRIPTION_PAYMENT_ERROR),
      });
    } finally {
      this.processing.set(false);
    }
  }

  goBack() {
    if (this.isOnboardingReturn()) {
      this.navigateToReturnUrl();
      return;
    }
    this.navigateToPlans();
  }

  private navigateToReturnUrl() {
    const target = this.returnUrl() || CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION_PLANS;
    this.router.navigate([target]);
  }

  private navigateToPlans() {
    this.router.navigate([CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION_PLANS]);
  }

  private isOnboardingReturn() {
    const target = this.returnUrl();
    return !!target && target.startsWith('/onboarding/');
  }

  private handleStatus(status: string | null) {
    if (status === 'success') {
      this.messages.add({
        severity: 'success',
        summary: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_SUCCESS,
        ),
        detail: this.translate.instant(CONSTANTS.SUBSCRIPTION_PLAN_ACTIVE, {
          plan: this.planTitle,
        }),
      });
      this.auth.refreshProfile();
      setTimeout(() => this.navigateToReturnUrl(), 1500);
      return;
    }

    if (status === 'canceled') {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_CANCELED,
        ),
        detail: this.translate.instant(
          CONSTANTS.SUBSCRIPTION_PAYMENT_RETRY,
        ),
      });
    }
  }

  private buildStatusUrl(
    plan: SubscriptionPlanCode,
    status: 'success' | 'canceled',
  ) {
    const base = window.location.origin;
    const params = new URLSearchParams({
      plan,
      status,
      returnUrl: this.returnUrl(),
    });
    return `${base}${CONSTANTS.ROUTES.SUBSCRIPTION.PAYMENT}?${params.toString()}`;
  }
}
