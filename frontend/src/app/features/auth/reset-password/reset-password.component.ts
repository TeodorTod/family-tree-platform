import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { AbstractControl, FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../shared/constants/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reset-password',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    CardModule,
    MessageModule,
    FloatLabelModule,
    PasswordModule,
    ButtonModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  CONSTANTS = CONSTANTS;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

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
  token = '';
  done = signal(false);
  error = signal<string>('');

  // SAME rules object as in Register
  rules = { lower: false, upper: false, number: false, special: false, min10: false };
  showPassRules = false;

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    // SAME subscribe + init as in Register
    const ctrl = this.form.get('password');
    ctrl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.updateRuleStates((v ?? '') as string));
    this.updateRuleStates((ctrl?.value ?? '') as string);
  }

  // SAME implementation as in Register
  private updateRuleStates(v: string) {
    let lower = 0, upper = 0, digit = 0, special = 0;
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

  onPasswordFocus() { this.showPassRules = true; }
  onPasswordBlur()  { this.showPassRules = !!this.form.get('password')?.invalid; }

  submit() {
    if (this.form.invalid || !this.token) return;
    this.error.set('');
    const { password, confirmPassword } = this.form.value;

    this.auth.resetPassword(this.token, password!, confirmPassword!)
      .subscribe({
        next: () => this.done.set(true),
        error: () => this.error.set(this.translate.instant('AUTH.RESET_ERROR')),
      });
  }
}
