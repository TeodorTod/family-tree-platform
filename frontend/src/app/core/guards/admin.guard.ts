import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { CONSTANTS } from '../../shared/constants/constants';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getTokenValue()) {
    router.navigate([CONSTANTS.ROUTES.LOGIN]);
    return false;
  }

  return auth.getProfile().pipe(
    map((user) => {
      if (user?.isAdmin) {
        return true;
      }
      router.navigate([CONSTANTS.ROUTES.HOME]);
      return false;
    }),
    catchError(() => {
      router.navigate([CONSTANTS.ROUTES.HOME]);
      return of(false);
    }),
  );
};
