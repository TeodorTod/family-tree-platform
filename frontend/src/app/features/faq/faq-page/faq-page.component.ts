import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';

type FaqItem = { qKey: string; aKey: string };

@Component({
  selector: 'app-faq-page',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './faq-page.component.html',
  styleUrls: ['./faq-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent {
  CONSTANTS = CONSTANTS;
  private translate = inject(TranslateService);

  faqItems = signal<FaqItem[]>([
    { qKey: CONSTANTS.FAQ_Q_WHAT_IS_APP, aKey: CONSTANTS.FAQ_A_WHAT_IS_APP },
    {
      qKey: CONSTANTS.FAQ_Q_HOW_ADD_FAMILY,
      aKey: CONSTANTS.FAQ_A_HOW_ADD_FAMILY,
    },
    { qKey: CONSTANTS.FAQ_Q_MEDIA_LIMITS, aKey: CONSTANTS.FAQ_A_MEDIA_LIMITS },
    {
      qKey: CONSTANTS.FAQ_Q_SUBSCRIPTIONS,
      aKey: CONSTANTS.FAQ_A_SUBSCRIPTIONS,
    },
    { qKey: CONSTANTS.FAQ_Q_PRIVACY, aKey: CONSTANTS.FAQ_A_PRIVACY },
    {
      qKey: CONSTANTS.FAQ_Q_MEMBERS_MANAGE,
      aKey: CONSTANTS.FAQ_A_MEMBERS_MANAGE,
    },
    {
      qKey: CONSTANTS.FAQ_Q_GLOBAL_SEARCH,
      aKey: CONSTANTS.FAQ_A_GLOBAL_SEARCH,
    },
    {
      qKey: CONSTANTS.FAQ_Q_SHARING_SETTINGS,
      aKey: CONSTANTS.FAQ_A_SHARING_SETTINGS,
    },
    {
      qKey: CONSTANTS.FAQ_Q_SHARING_REQUESTS,
      aKey: CONSTANTS.FAQ_A_SHARING_REQUESTS,
    },
    { qKey: CONSTANTS.FAQ_Q_GDPR, aKey: CONSTANTS.FAQ_A_GDPR },
  ]);
}
