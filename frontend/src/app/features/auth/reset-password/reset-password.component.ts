import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { AuthService } from '../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../shared/constants/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  CONSTANTS = CONSTANTS;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  form = this.auth.resetPasswordForm;
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
