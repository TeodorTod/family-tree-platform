import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
import { LoginResponse } from '../../../shared/models/login-response.model';
import { RegisterRequest } from '../../../shared/models/register-request.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  private token = signal<string | null>(localStorage.getItem('token'));

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        {
          email,
          password,
        },
        { withCredentials: true }
      )

      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          localStorage.setItem('token', res.access_token);
        })
      );
  }

register(email: string, password: string, confirmPassword: string) {
  const data: RegisterRequest = { email, password, confirmPassword };
  return this.http.post<LoginResponse>(
    `${environment.apiUrl}/auth/register`,
    data,
    { withCredentials: true } 
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
}
