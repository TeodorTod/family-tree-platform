import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { FamilyService } from '../../../core/services/family.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  CONSTANTS = CONSTANTS;

  auth = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);
  familyService = inject(FamilyService);
  private destroyRef = inject(DestroyRef);

  error = signal('');
  form = this.auth.loginForm;

  ngOnInit(): void {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      this.auth.getTokenSignal().set(token);
      this.router.navigate([CONSTANTS.ROUTES.TREE]);
    }
  }

  login() {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;

    this.auth
      .login(email!, password!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.familyService
            .getMyFamily()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((family) => {
              if (!family || family.length === 0) {
                this.router.navigate([CONSTANTS.ROUTES.ONBOARDING.OWNER]);
              } else {
                this.router.navigate([CONSTANTS.ROUTES.TREE]);
              }
            });
        },
        error: () => {
          this.error.set(this.translate.instant(CONSTANTS.AUTH_LOGIN_ERROR));
        },
      });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}${CONSTANTS.ROUTES.AUTH_GOOGLE_LOGIN}`;
  }
}
