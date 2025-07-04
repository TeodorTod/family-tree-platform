import { Routes } from '@angular/router';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { PrivacySettingsComponent } from './privacy-settings/privacy-settings.component';
import { SubscriptionSettingsComponent } from './subscription-settings/subscription-settings.component';

export const settingsRoutes: Routes = [
  { path: 'account', component: AccountSettingsComponent },
  { path: 'subscription', component: SubscriptionSettingsComponent },
  { path: 'privacy', component: PrivacySettingsComponent },
];
