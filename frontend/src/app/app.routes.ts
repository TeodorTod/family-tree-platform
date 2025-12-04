import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'account',
    loadChildren: () =>
      import('./features/account/account.routes').then((m) => m.accountRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./features/family-onboarding/family-onboarding.routes').then(
        (m) => m.familyOnboardingRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/home/home.route').then((m) => m.homeRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'tree',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'member',
    loadChildren: () =>
      import('./features/member/member.routes').then((m) => m.memberRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'faq',
    loadChildren: () =>
      import('./features/faq/faq.routes').then((m) => m.default),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.page').then(
        (m) => m.PrivacyPolicyPage,
      ),
  },
  {
    path: 'cookies',
    loadComponent: () =>
      import('./pages/cookie-policy/cookie-policy.page').then(
        (m) => m.CookiePolicyPage,
      ),
  },
  {
    path: 'subscription/payment',
    loadComponent: () =>
      import('./pages/subscription-payment/subscription-payment.page').then(
        (m) => m.SubscriptionPaymentPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/global-search/global-search.page').then((m) => m.GlobalSearchPage),
    canActivate: [authGuard],
  },
  {
    path: 'settings/sharing',
    loadComponent: () =>
      import('./pages/settings-sharing/settings-sharing.page').then((m) => m.SettingsSharingPage),
    canActivate: [authGuard],
  },
  {
    path: 'sharing/requests',
    loadComponent: () =>
      import('./pages/sharing-requests/sharing-requests.page').then((m) => m.SharingRequestsPage),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./features/settings/settings.routes').then(
        (m) => m.settingsRoutes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'contact',
    loadChildren: () =>
      import('./features/contact/contact.routes').then((m) => m.contactRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [adminGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
