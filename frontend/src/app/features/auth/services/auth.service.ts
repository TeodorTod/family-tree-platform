import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subject, tap } from 'rxjs';
import { LoginResponse } from '../../../shared/models/login-response.model';
import { RegisterRequest } from '../../../shared/models/register-request.model';
import { Lang } from '../../../shared/types/lang.type';
import { AuthUser } from '../../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private token = signal<string | null>(localStorage.getItem('token'));
  private profileRefresh$ = new Subject<void>();

  login(
    email: string,
    password: string,
    language?: Lang,
    recaptchaToken?: string,
  ) {
    const payload: Record<string, unknown> = {
      email,
      password,
    };
    if (language) {
      payload['language'] = language;
    }
    if (recaptchaToken) {
      payload['recaptchaToken'] = recaptchaToken;
    }

    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        payload,
        { withCredentials: true }
      )

      .pipe(
        tap((res) => {
          const lang = (res.user?.language as Lang | undefined) ?? 'bg';
          localStorage.setItem('lang', lang);
          this.token.set(res.access_token);
          localStorage.setItem('token', res.access_token);
        })
      );
  }

  register(
    email: string,
    password: string,
    confirmPassword: string,
    language: Lang,
  ) {
    const data: RegisterRequest = { email, password, confirmPassword, language };
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/auth/register`,
      data,
      { withCredentials: true }
    );
  }

  getProfile() {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`, {
      withCredentials: true,
    });
  }

  updateLanguagePreference(language: Lang) {
    return this.http.patch<{ language: Lang }>(
      `${environment.apiUrl}/auth/language`,
      { language },
      { withCredentials: true },
    );
  }

  logout() {
    this.token.set(null);
    localStorage.removeItem('token');
  }

  getTokenSignal() {
    return this.token;
  }

  getTokenValue() {
    return this.token();
  }

  isLoggedInSignal() {
    return signal(() => this.token() !== null);
  }

  requestPasswordReset(email: string) {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, {
      email,
    });
  }

  resetPassword(token: string, password: string, confirmPassword: string) {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token,
      password,
      confirmPassword,
    });
  }

  onProfileRefresh() {
    return this.profileRefresh$.asObservable();
  }

  refreshProfile() {
    this.profileRefresh$.next();
  }
}
