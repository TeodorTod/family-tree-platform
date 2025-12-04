import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { AuthService } from '../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../shared/constants/constants';

@Component({
  selector: 'app-forgot-password',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  done = signal(false);
  error = signal<string>('');

  submit() {
    if (this.form.invalid) return;
    this.error.set('');
    const { email } = this.form.value;

    this.auth.requestPasswordReset(email!).subscribe({
      next: () => this.done.set(true),
      error: () => this.done.set(true), 
    });
  }
}
