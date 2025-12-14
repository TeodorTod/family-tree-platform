import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../shared/constants/constants';
import { SUBSCRIPTION_PLAN_OPTIONS } from '../../../shared/constants/subscription-plan-options';
import {
  SubscriptionPlanCode,
  SubscriptionPlanOption,
} from '../../../shared/types/subscription-plan.type';

@Component({
  selector: 'app-onboarding-subscription-plan',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './subscription-plan.component.html',
  styleUrl: './subscription-plan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPlanComponent {
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly CONSTANTS = CONSTANTS;
  readonly plans = SUBSCRIPTION_PLAN_OPTIONS;
  readonly selecting = signal<SubscriptionPlanCode | null>(null);
  readonly currencySymbol = computed(() =>
    this.translate.instant(CONSTANTS.COMMON_CURRENCY_EUR)
  );

  select(plan: SubscriptionPlanOption) {
    if (this.selecting()) {
      return;
    }

    if (plan.requiresCheckout === false) {
      this.skip();
      return;
    }

    this.selecting.set(plan.code);
    void this.router
      .navigate([CONSTANTS.ROUTES.SUBSCRIPTION.PAYMENT], {
        queryParams: {
          plan: plan.code,
          returnUrl: CONSTANTS.ROUTES.ONBOARDING.SUBSCRIPTION,
        },
      })
      .finally(() => this.selecting.set(null));
  }

  skip() {
    this.navigateToTree();
  }

  perDay(plan: SubscriptionPlanOption) {
    if (!plan.durationDays) {
      return '0.00';
    }
    return (plan.priceEur / plan.durationDays).toFixed(2);
  }

  private navigateToTree() {
    this.router.navigate([CONSTANTS.ROUTES.HOME]);
  }
}
