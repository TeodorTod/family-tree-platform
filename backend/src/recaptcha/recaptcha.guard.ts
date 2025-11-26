import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
} from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

export function RecaptchaGuard(action: string) {
  @Injectable()
  class RecaptchaGuardMixin implements CanActivate {
    constructor(readonly recaptcha: RecaptchaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      await this.recaptcha.verify(request.body?.recaptchaToken, action);
      return true;
    }
  }

  return mixin(RecaptchaGuardMixin);
}
