import { ChangeDetectionStrategy, Component, DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidatorFn, Validators } from '@angular/forms';
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
  private readonly passwordsMatchValidator: ValidatorFn = (group: AbstractControl) => {
    const pass = group.get('password')?.value ?? '';
    const conf = group.get('confirmPassword')?.value ?? '';
    if (!pass || !conf) {
      return null;
    }
    return pass === conf ? null : { passwordsMismatch: true };
  };

  form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/[a-z]/),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/\d/),
          Validators.pattern(/[^A-Za-z0-9]/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator }
  );
  private langKeys: string[] = ['COMMON.LANG_BG', 'COMMON.LANG_EN'];
  private langLabels = this.createLanguageLabelSignal();
  langOptions = computed(() => {
    const labels = this.langLabels();
    return [
      { label: labels['COMMON.LANG_BG'], value: 'bg' as Lang },
      { label: labels['COMMON.LANG_EN'], value: 'en' as Lang },
    ];
  });
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
  }

  private instantLabels() {
    return this.langKeys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = this.translate.instant(key);
      return acc;
    }, {});
  }

  private createLanguageLabelSignal(): Signal<Record<string, string>> {
    const initial = this.instantLabels();
    const labels = signal(initial);
    this.translate
      .stream(this.langKeys)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => labels.set(value as Record<string, string>));
    return labels.asReadonly();
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
