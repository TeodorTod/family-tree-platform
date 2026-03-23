import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';
import { CONSTANTS } from '../../shared/constants/constants';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getTokenValue()) {
    return router.createUrlTree([CONSTANTS.ROUTES.LOGIN]);
  }

  return true;
};
