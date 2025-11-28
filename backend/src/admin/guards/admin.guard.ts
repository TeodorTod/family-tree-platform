import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isAdminEmail } from '../../shared/constants/admin.constants';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: any }>();
    const user = request?.user;
    if (!user || !isAdminEmail(user.email)) {
      throw new ForbiddenException('Admin privileges required');
    }
    if (user.isAdmin !== true) {
      throw new ForbiddenException('Admin privileges required');
    }
    return true;
  }
}
