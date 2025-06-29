import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private token = signal<string | null>(localStorage.getItem('token'));

  login(email: string, password: string) {
    return this.http
      .post<{ access_token: string; user: any }>(
        `${environment.apiUrl}/auth/login`,
        { email, password }
      )
      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          localStorage.setItem('token', res.access_token);
        })
      );
  }

  register(email: string, password: string, confirmPassword: string) {
    return this.http
      .post<{ access_token: string; user: any }>(
        `${environment.apiUrl}/auth/register`,
        { email, password, confirmPassword }
      )
      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          localStorage.setItem('token', res.access_token);
        })
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
