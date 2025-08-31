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
import { Roles } from '../../../shared/enums/roles.enum';

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
              console.log('Family on login:', family);

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
        error: () => {
          this.error.set(this.translate.instant(CONSTANTS.AUTH_LOGIN_ERROR));
        },
      });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}${CONSTANTS.ROUTES.AUTH_GOOGLE_LOGIN}`;
  }
}
