import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private tokenStorage = inject(TokenStorageService);
  private authService = inject(AuthService);
  private handlingUnauthorized = false;

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.tokenStorage.getToken();

    const authReq = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.handleUnauthorized();
        }
        return throwError(() => err);
      })
    );
  }

  private handleUnauthorized() {
    if (this.handlingUnauthorized) {
      return;
    }
    this.handlingUnauthorized = true;
    this.authService.logout();
    void this.router.navigate(['/auth/login']).finally(() => {
      this.handlingUnauthorized = false;
    });
  }
}
