import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { FamilyService } from '../../../core/services/family.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Roles } from '../../../shared/enums/roles.enum';
import { LanguageService } from '../../../../assets/i18n/language.service';
import { Lang } from '../../../shared/types/lang.type';
import {
  RecaptchaException,
  RecaptchaService,
} from '../../../core/services/recaptcha.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    SelectModule,
    InputTextModule,
    FloatLabelModule,
    PasswordModule,
    MessageModule,
    DialogModule,
    ButtonModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);
  familyService = inject(FamilyService);
  lang = inject(LanguageService);
  recaptcha = inject(RecaptchaService);

  private destroyRef = inject(DestroyRef);
  private readonly pendingLangKey = 'ft-pending-lang-pref';

  error = signal('');
  showMobileHint = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  langOptions = [
    { label: this.translate.instant('COMMON.LANG_BG'), value: 'bg' as Lang },
    { label: this.translate.instant('COMMON.LANG_EN'), value: 'en' as Lang },
  ];
  currentLang: Lang = this.lang.current();
  private initialLang: Lang = this.currentLang;
  langDirty = false;

  ngOnInit(): void {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      this.auth.setToken(token);
      const pendingLang = sessionStorage.getItem(
        this.pendingLangKey
      ) as Lang | null;

      if (pendingLang) {
        this.applyLanguage(pendingLang, false);
        this.auth.updateLanguagePreference(pendingLang).subscribe({
          next: () => this.applyLanguage(pendingLang),
          error: () => void 0,
        });
      } else {
        this.auth.getProfile().subscribe({
          next: (user) => {
            if (user?.language) {
              this.applyLanguage(user.language as Lang);
            }
          },
          error: () => void 0,
        });
      }

      sessionStorage.removeItem(this.pendingLangKey);
      this.router.navigate([CONSTANTS.ROUTES.TREE]);
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      this.showMobileHint.set(true);
      setTimeout(() => this.showMobileHint.set(false), 10000);
    }
  }

  get dialogVisible() {
    return this.showMobileHint();
  }
  set dialogVisible(v: boolean) {
    this.showMobileHint.set(v);
  }

  ngOnDestroy(): void {
    this.recaptcha.cleanup();
  }

  switchLang(code: Lang) {
    this.applyLanguage(code, false);
    this.langDirty = code !== this.initialLang;
  }

  login() {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;
    const langOverride = this.langDirty ? this.currentLang : undefined;

    this.error.set('');

    this.recaptcha
      .execute('login')
      .pipe(
        switchMap((token) =>
          this.auth.login(email!, password!, langOverride, token)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          const serverLang =
            (res?.user?.language as Lang | undefined) ?? this.currentLang;
          if (serverLang) {
            this.applyLanguage(serverLang);
          }
          this.langDirty = false;

          this.familyService
            .getMyFamily()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((family) => {
              if (!family || family.length === 0) {
                this.router.navigate([CONSTANTS.ROUTES.ONBOARDING.OWNER]);
                return;
              }

              const roles = new Set(
                family.map((m) => String(m.role || '').toLowerCase())
              );

              if (!roles.has(Roles.MOTHER)) {
                this.router.navigate([CONSTANTS.ROUTES.ONBOARDING.MOTHER]);
              } else if (
                !roles.has(Roles.MATERNAL_GRANDMOTHER) ||
                !roles.has(Roles.MATERNAL_GRANDFATHER)
              ) {
                this.router.navigate([
                  CONSTANTS.ROUTES.ONBOARDING.MATERNAL_GRANDPARENTS,
                ]);
              } else if (!roles.has(Roles.FATHER)) {
                this.router.navigate([CONSTANTS.ROUTES.ONBOARDING.FATHER]);
              } else if (
                !roles.has(Roles.PATERNAL_GRANDMOTHER) ||
                !roles.has(Roles.PATERNAL_GRANDFATHER)
              ) {
                this.router.navigate([
                  CONSTANTS.ROUTES.ONBOARDING.PATERNAL_GRANDPARENTS,
                ]);
              } else {
                this.router.navigate([CONSTANTS.ROUTES.TREE]);
              }
            });
        },
        error: (err) => {
          if (err instanceof RecaptchaException) {
            this.error.set(
              this.translate.instant(CONSTANTS.COMMON_RECAPTCHA_FAILED)
            );
            return;
          }
          this.error.set(this.translate.instant(CONSTANTS.AUTH_LOGIN_ERROR));
        },
      });
  }

  loginWithGoogle() {
    if (this.langDirty) {
      sessionStorage.setItem(this.pendingLangKey, this.currentLang);
    } else {
      sessionStorage.removeItem(this.pendingLangKey);
    }
    window.location.href = `${environment.apiUrl}${CONSTANTS.ROUTES.AUTH_GOOGLE_LOGIN}`;
  }

  private applyLanguage(lang: Lang, persistBaseline = true) {
    this.lang.use(lang);
    this.currentLang = lang;
    this.refreshLangOptions();
    if (persistBaseline) {
      this.initialLang = lang;
      this.langDirty = false;
    }
  }

  private refreshLangOptions() {
    this.langOptions = [
      { label: this.translate.instant('COMMON.LANG_BG'), value: 'bg' as Lang },
      { label: this.translate.instant('COMMON.LANG_EN'), value: 'en' as Lang },
    ];
  }
}
