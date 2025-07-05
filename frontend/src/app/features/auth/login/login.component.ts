import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { FamilyService } from '../../../core/services/family.service';

@Component({
  selector: 'app-login',
  standalone: true,
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

  error = signal('');
  form = this.auth.loginForm;

  ngOnInit(): void {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('token', token);
      this.auth.getTokenSignal().set(token);
      this.router.navigate(['/tree']);
    }
  }

  login() {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.familyService.getMyFamily().subscribe((family) => {
          if (family.length === 0) {
            this.router.navigate(['/onboarding/owner']);
          } else {
            this.router.navigate(['/tree']);
          }
        });
      },
    });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }
}
