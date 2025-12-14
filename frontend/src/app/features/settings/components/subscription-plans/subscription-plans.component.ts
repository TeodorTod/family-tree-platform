// features/settings/subscription-plans/subscription-plans.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { AccountService } from '../../../account/services/account.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthUser } from '../../../../shared/models/user.model';
import { SUBSCRIPTION_PLAN_OPTION_MAP } from '../../../../shared/constants/subscription-plan-options';

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
  private account = inject(AccountService);
  private destroyRef = inject(DestroyRef);
  private readonly dayMs = 24 * 60 * 60 * 1000;

  readonly CONSTANTS = CONSTANTS;
  readonly plans = SUBSCRIPTION_PLAN_OPTIONS;
  readonly currencySymbol = computed(() =>
    this.t.instant(CONSTANTS.COMMON_CURRENCY_EUR)
  );
  readonly isNavigating = signal<SubscriptionPlanCode | null>(null);
  readonly profile = signal<AuthUser | null>(null);
  readonly loadingProfile = signal(true);
  readonly currentPlanLabel = computed(() => {
    const code = this.profile()?.subscriptionPlan ?? null;
    if (!code) {
      return null;
    }
    const option = SUBSCRIPTION_PLAN_OPTION_MAP.get(code);
    return option ? this.t.instant(option.titleKey) : code;
  });
  readonly currentPlanEndDate = computed(() =>
    this.computeRenewalDate(this.profile()),
  );

  constructor() {
    this.account
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => this.profile.set(user),
        complete: () => this.loadingProfile.set(false),
        error: () => this.loadingProfile.set(false),
      });
  }

  private computeRenewalDate(user: AuthUser | null) {
    if (!user) {
      return null;
    }
    if (user.subscriptionEndAt) {
      return new Date(user.subscriptionEndAt);
    }
    if (!user.subscriptionPlan || !user.subscriptionStartAt) {
      return null;
    }
    const option = SUBSCRIPTION_PLAN_OPTION_MAP.get(
      user.subscriptionPlan as SubscriptionPlanCode,
    );
    if (!option || !option.durationDays) {
      return null;
    }
    const start = new Date(user.subscriptionStartAt);
    if (Number.isNaN(start.getTime())) {
      return null;
    }
    return new Date(start.getTime() + option.durationDays * this.dayMs);
  }

  perDayStr(plan: SubscriptionPlanOption): string {
    if (!plan.durationDays) {
      return '0.00';
    }
    return (plan.priceEur / plan.durationDays).toFixed(2);
  }

  totalStr(plan: SubscriptionPlanOption): string {
    return `${this.currencySymbol()}${plan.priceEur}`;
  }

  select(plan: SubscriptionPlanOption) {
    if (this.isNavigating() || plan.requiresCheckout === false) {
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
