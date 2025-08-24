// src/app/core/interceptors/loading.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { environment } from '../../environments/environment';


@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private loading = inject(LoadingService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApi = req.url.startsWith(environment.apiUrl);

    const skip = req.headers.has('X-Skip-Spinner');

    if (isApi && !skip) {
      this.loading.show();
      return next.handle(req).pipe(finalize(() => this.loading.hide()));
    }

    return next.handle(req);
  }
}
