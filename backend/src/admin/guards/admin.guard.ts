import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: any }>();
    const user = request?.user;
    if (!user || user.isAdmin !== true) {
      throw new ForbiddenException('Admin privileges required');
    }
    return true;
  }
}
