// navbar.component.ts
import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../assets/i18n/language.service';
import { Subscription } from 'rxjs';
import { Lang } from '../../../shared/types/lang.type';
import { MenuItem } from 'primeng/api';
import { SharingNotificationsService } from '../../services/sharing-notifications.service';

@Component({
  selector: 'app-navbar',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS, NgOptimizedImage],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnDestroy {
  CONSTANTS = CONSTANTS;
  logoTitle = signal('');
  private displayName = signal('');

  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private notifications = inject(SharingNotificationsService);

  private sub = new Subscription();
  private profileRequest?: Subscription;

  isLoggedIn = this.auth.getTokenSignal();
  mobileMenuVisible = false;

  // Language items for split button
  langItems: MenuItem[] = [];
  currentLangLabel = '';

  // Settings items for split button
  settingsItems: MenuItem[] = [];
  currentSettingsLabel = '';

  // Profile items for split button
  profileItems: MenuItem[] = [];
  searchText = '';
  totalPending = this.notifications.totalPending;

  constructor() {
    this.updateLabels();

    this.sub.add(
      this.translate.onLangChange.subscribe(() => {
        this.updateLabels();
      })
    );

    effect(() => {
      const token = this.isLoggedIn();
      if (token) {
        this.notifications.refresh();
        this.loadProfileDisplayName();
      } else {
        this.notifications.reset();
        this.displayName.set('');
        this.refreshLogoTitle();
      }
    });

    this.sub.add(
      this.auth.onProfileRefresh().subscribe(() => {
        if (this.isLoggedIn()) {
          this.loadProfileDisplayName();
        }
      })
    );
  }

  private updateLabels() {
    // Update language items
    const currentLang = this.lang.current();
    this.currentLangLabel =
      currentLang === 'bg'
        ? this.translate.instant(CONSTANTS.COMMON_LANG_BG)
        : this.translate.instant(CONSTANTS.COMMON_LANG_EN);

    this.langItems = [
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_BG),
        icon: 'pi pi-globe',
        command: () => this.switchLang('bg'),
      },
       { separator: true },
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_EN),
        icon: 'pi pi-globe',
        command: () => this.switchLang('en'),
      },
    ];

    // Update settings items
    this.currentSettingsLabel = this.translate.instant(
      CONSTANTS.COMMON_SETTINGS
    );
    this.settingsItems = [
      {
        label: this.translate.instant(CONSTANTS.SETTINGS_PLANS),
        icon: 'pi pi-credit-card',
        command: () =>
          this.goToSettings(CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION_PLANS),
      },
      { separator: true },
      {
        label: this.translate.instant(CONSTANTS.SHARING_SETTINGS_TITLE),
        icon: 'pi pi-shield',
        command: () => {
          this.router.navigate([CONSTANTS.ROUTES.SETTINGS.SHARING]);
          this.mobileMenuVisible = false;
        },
      },
      {
        label: this.translate.instant(CONSTANTS.SHARING_REQUESTS_MENU),
        icon: 'pi pi-inbox',
        command: () => {
          this.router.navigate([CONSTANTS.ROUTES.SHARING.REQUESTS]);
          this.mobileMenuVisible = false;
        },
      },
      { separator: true },
      {
        label: this.translate.instant(CONSTANTS.COMMON_CONTACT_US), // reuse your existing key
        icon: 'pi pi-envelope',
        command: () => {
          this.router.navigate(['/contact']);
          this.mobileMenuVisible = false;
        },
      },
    ];

    // Update profile items
    this.profileItems = [
      {
        label: this.translate.instant(CONSTANTS.AUTH_ACCOUNT_SETTINGS),
        icon: 'pi pi-user-edit',
        command: () => {
          this.router.navigate([CONSTANTS.ROUTES.ACCOUNT.MY_ACCOUNT]);
          this.mobileMenuVisible = false;
        },
      },
      { separator: true },
      {
        label: this.translate.instant(CONSTANTS.AUTH_SUBSCRIPTION_SETTINGS),
        icon: 'pi pi-credit-card',
        command: () => {
          this.router.navigate([CONSTANTS.ROUTES.ACCOUNT.SUBSCRIPTION]);
          this.mobileMenuVisible = false;
        },
      },
      { separator: true },
      {
        label: this.translate.instant(CONSTANTS.AUTH_PRIVACY_SETTINGS),
        icon: 'pi pi-lock',
        command: () => {
          this.router.navigate([CONSTANTS.ROUTES.ACCOUNT.PRIVACY]);
          this.mobileMenuVisible = false;
        },
      },
    ];

    this.refreshLogoTitle();
  }

  shouldShowNavbar(): boolean {
    const tree = this.router.parseUrl(this.router.url);

    const path =
      '/' +
      (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ??
        '');

    const isAuthResetWithToken =
      path === '/auth/reset' && !!tree.queryParams['token'];

    const hideOnPaths = ['/auth/login', '/auth/register', '/auth/forgot'];
    const isOtherAuthPage = hideOnPaths.includes(path);

    return !(isOtherAuthPage || isAuthResetWithToken);
  }

  switchLang(code: Lang) {
    this.lang.use(code);
    this.auth.updateLanguagePreference(code).subscribe({
      error: () => void 0,
    });
    this.mobileMenuVisible = false;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
    this.mobileMenuVisible = false;
    localStorage.clear();
  }

  navigate(path: string): void {
    this.router.navigate([path]);
    this.mobileMenuVisible = false;
  }

  submitSearch() {
    const q = (this.searchText || '').trim();
    this.router.navigate(['/search'], { queryParams: { q: q || null } });
    this.mobileMenuVisible = false;
  }

  goToSettings(path: string) {
    if (path) {
      this.router.navigateByUrl(path);
      this.mobileMenuVisible = false;
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.profileRequest?.unsubscribe();
  }

  private loadProfileDisplayName() {
    this.profileRequest?.unsubscribe();
    this.profileRequest = this.auth.getProfile().subscribe({
      next: (user) => {
        const name = (user?.displayName ?? '').trim();
        this.displayName.set(name);
        this.refreshLogoTitle();
      },
      error: () => {
        this.displayName.set('');
        this.refreshLogoTitle();
      },
    });
  }

  private refreshLogoTitle() {
    const name = this.displayName().trim();
    const translated = name
      ? this.translate.instant(CONSTANTS.COMMON_APP_NAME_PERSONALIZED, {
          name,
        })
      : this.translate.instant(CONSTANTS.COMMON_APP_NAME);
    this.logoTitle.set(translated);
  }
}
