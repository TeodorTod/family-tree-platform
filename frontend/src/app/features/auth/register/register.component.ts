import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageService } from '../../../../assets/i18n/language.service';
import { Lang } from '../../../shared/types/lang.type';

@Component({
  selector: 'app-register',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './register.component.html',
  styleUrls: ['../login/login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  CONSTANTS = CONSTANTS;

  fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);
  lang = inject(LanguageService);

  destroyRef = inject(DestroyRef);

  error = signal('');
  form = this.auth.registerForm;
  langOptions = [
    { label: this.translate.instant('COMMON.LANG_BG'), value: 'bg' as Lang },
    { label: this.translate.instant('COMMON.LANG_EN'), value: 'en' as Lang },
  ];
  currentLang: Lang = this.lang.current();
  rules = {
    lower: false,
    upper: false,
    number: false,
    special: false,
    min10: false,
  };
  showPassRules = false;

  constructor() {
    const ctrl = this.form.get('password');
    ctrl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.updateRuleStates((v ?? '') as string);
      });
    this.updateRuleStates((ctrl?.value ?? '') as string);
  }

  private updateRuleStates(v: string) {
    let lower = 0,
      upper = 0,
      digit = 0,
      special = 0;
    for (let i = 0; i < v.length; i++) {
      const c = v.charCodeAt(i);
      if (c >= 48 && c <= 57) digit++; 
      else if (c >= 65 && c <= 90) upper++; 
      else if (c >= 97 && c <= 122) lower++;
      else special++; 
    }
    this.rules = {
      lower: lower > 0,
      upper: upper > 0,
      number: digit > 0,
      special: special > 0,
      min10: v.length >= 10,
    };
  }

  switchLang(code: Lang) {
    this.lang.use(code);
    this.langOptions = [
      { label: this.translate.instant('COMMON.LANG_BG'), value: 'bg' },
      { label: this.translate.instant('COMMON.LANG_EN'), value: 'en' },
    ];
  }

  register() {
    const { email, password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.error.set(
        this.translate.instant(CONSTANTS.AUTH_PASSWORDS_NOT_MATCH)
      );
      return;
    }

    this.auth
      .register(email!, password!, confirmPassword!, this.currentLang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate([CONSTANTS.ROUTES.LOGIN]),
        error: (err) =>
          this.error.set(
            err.error?.message ??
              this.translate.instant(CONSTANTS.AUTH_REGISTER_FAILED)
          ),
      });
  }

  onPasswordFocus() {
    this.showPassRules = true;
  }

  onPasswordBlur() {
    const ctrl = this.form.get('password');
    this.showPassRules = !!(ctrl && ctrl.invalid);
  }
}
