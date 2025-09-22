// navbar.component.ts
import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../assets/i18n/language.service';
import { Subscription } from 'rxjs';
import { Lang } from '../../../shared/types/lang.type';

@Component({
  selector: 'app-navbar',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnDestroy {
  CONSTANTS = CONSTANTS;

  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  private sub = new Subscription();

  isLoggedIn = this.auth.getTokenSignal();
  mobileMenuVisible = false;
  showProfileMenu = false;

  // bound in template
  langOptions = this.buildLangOptions();
  currentLang: Lang = this.lang.current();

  constructor() {
    // When language changes, rebuild labels and options
    this.sub.add(
      this.translate.onLangChange.subscribe(() => {
        this.settingsItems = this.buildSettings();
        this.langOptions = this.buildLangOptions();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  shouldShowNavbar(): boolean {
    return !['/auth/login', '/auth/register'].includes(this.router.url);
  }

  switchLang(code: Lang) {
    this.lang.use(code);
    // onLangChange subscription will refresh labels/options
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

  // Settings menu built from current translations
  settingsItems = this.buildSettings();
  private buildSettings() {
    return [
      {
        label: this.translate.instant(CONSTANTS.AUTH_ACCOUNT_SETTINGS),
        icon: 'pi pi-user-edit',
        command: () =>
          this.router.navigate([CONSTANTS.ROUTES.SETTINGS.ACCOUNT]),
      },
      {
        label: this.translate.instant(CONSTANTS.AUTH_SUBSCRIPTION_SETTINGS),
        icon: 'pi pi-credit-card',
        command: () =>
          this.router.navigate([CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION]),
      },
      {
        label: this.translate.instant(CONSTANTS.AUTH_PRIVACY_SETTINGS),
        icon: 'pi pi-lock',
        command: () =>
          this.router.navigate([CONSTANTS.ROUTES.SETTINGS.PRIVACY]),
      },
    ];
  }

  private buildLangOptions() {
    return [
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_BG),
        value: 'bg' as Lang,
      },
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_EN),
        value: 'en' as Lang,
      },
    ];
  }
}
