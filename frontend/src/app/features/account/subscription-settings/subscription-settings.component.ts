import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { AccountService } from '../services/account.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthUser } from '../../../shared/models/user.model';
import { SubscriptionPlanCode } from '../../../shared/types/subscription-plan.type';
import {
  SUBSCRIPTION_PLAN_OPTION_MAP,
  SUBSCRIPTION_PLAN_OPTIONS,
} from '../../../shared/constants/subscription-plan-options';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-subscription-settings',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './subscription-settings.component.html',
  styleUrl: './subscription-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSettingsComponent {
  private account = inject(AccountService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  readonly CONSTANTS = CONSTANTS;
  readonly profile = signal<AuthUser | null>(null);
  readonly isLoading = signal(true);
  readonly planLabel = computed(() => {
    const code = this.profile()?.subscriptionPlan ?? null;
    if (!code) return null;
    const option = SUBSCRIPTION_PLAN_OPTION_MAP.get(code);
    return option ? this.translate.instant(option.titleKey) : code;
  });

  constructor() {
    this.account
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => this.profile.set(user),
        complete: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      });
  }
}
