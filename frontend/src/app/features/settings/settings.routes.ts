import { Routes } from '@angular/router';
import { SubscriptionPlansComponent } from './components/subscription-plans/subscription-plans.component';

export const settingsRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'plans' },
  { path: 'plans', component: SubscriptionPlansComponent },
];
