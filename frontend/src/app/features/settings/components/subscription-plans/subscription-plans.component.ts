// features/settings/subscription-plans/subscription-plans.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { SUBSCRIPTION_PLAN_OPTIONS } from '../../../../shared/constants/subscription-plan-options';
import {
  SubscriptionPlanCode,
  SubscriptionPlanOption,
} from '../../../../shared/types/subscription-plan.type';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscription-plans',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPlansComponent {
  private t = inject(TranslateService);
  private router = inject(Router);

  readonly CONSTANTS = CONSTANTS;
  readonly plans = SUBSCRIPTION_PLAN_OPTIONS;
  readonly currencySymbol = computed(() =>
    this.t.instant(CONSTANTS.COMMON_CURRENCY_EUR)
  );
  readonly isNavigating = signal<SubscriptionPlanCode | null>(null);

  perDayStr(plan: SubscriptionPlanOption): string {
    return (plan.priceEur / plan.durationDays).toFixed(2);
  }

  totalStr(plan: SubscriptionPlanOption): string {
    return `${this.currencySymbol()}${plan.priceEur}`;
  }

  select(plan: SubscriptionPlanOption) {
    if (this.isNavigating()) {
      return;
    }

    this.isNavigating.set(plan.code);
    void this.router
      .navigate([CONSTANTS.ROUTES.SUBSCRIPTION.PAYMENT], {
        queryParams: {
          plan: plan.code,
          returnUrl: CONSTANTS.ROUTES.ACCOUNT.SUBSCRIPTION,
        },
      })
      .finally(() => this.isNavigating.set(null));
  }
}
