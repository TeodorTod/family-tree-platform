// features/settings/subscription-plans/subscription-plans.component.ts
import { Component, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { Plan } from '../../../../shared/types/plan.type';

@Component({
  selector: 'app-subscription-plans',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
})
export class SubscriptionPlansComponent {
  private t = inject(TranslateService);

  CONSTANTS = CONSTANTS;
  EUR = this.t.instant(CONSTANTS.COMMON_CURRENCY_EUR);

  plans: Plan[] = [
    { code: '6m', titleKey: CONSTANTS.SETTINGS_PLAN_6M, total: 39, days: 182 },
    {
      code: '1y',
      titleKey: CONSTANTS.SETTINGS_PLAN_1Y,
      total: 69,
      days: 365,
      highlight: true,
    },
    { code: '2y', titleKey: CONSTANTS.SETTINGS_PLAN_2Y, total: 109, days: 730 },
  ];

  perDayStr(p: Plan): string {
    return (p.total / p.days).toFixed(2);
  }
  totalStr(p: Plan): string {
    return `${this.EUR}${p.total}`;
  }

  select(p: Plan) {
    console.log('Selected plan:', p.code);
  }
}
