import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  CONSTANTS = CONSTANTS;

  auth = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);

  error = signal('');
  form = this.auth.loginForm;

  login() {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/tree']),
      error: (err) =>
        this.error.set(
          err.error?.message ??
            this.translate.instant(CONSTANTS.AUTH_LOGIN_FAILED)
        ),
    });
  }
}
