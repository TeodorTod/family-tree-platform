import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RecaptchaVerifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
};

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret: string | undefined;
  private readonly minScore: number;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('RECAPTCHA_SECRET_KEY')?.trim();
    this.minScore = Number(this.config.get('RECAPTCHA_MIN_SCORE') ?? 0.5);
    if (!this.secret) {
      this.logger.warn(
        'RECAPTCHA_SECRET_KEY is not configured. Verification is disabled.',
      );
    }
  }

  async verify(responseToken: string | undefined, action: string): Promise<void> {
    if (!this.secret) {
      return;
    }

    if (!responseToken) {
      throw new BadRequestException('Missing reCAPTCHA token');
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', this.secret);
      params.append('response', responseToken);

      const res = await fetch(
        'https://example.invalid',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );

      if (!res.ok) {
        this.logger.error(
          `reCAPTCHA verify failed with status ${res.status} ${res.statusText}`,
        );
        throw new ServiceUnavailableException(
          'Unable to verify reCAPTCHA at this time',
        );
      }

      const payload = (await res.json()) as RecaptchaVerifyResponse;
      if (!payload.success) {
        this.logger.warn(
          `reCAPTCHA rejected request: ${payload['error-codes']?.join(', ')}`,
        );
        throw new UnauthorizedException('Failed reCAPTCHA validation');
      }

      if (payload.action && action && payload.action !== action) {
        this.logger.warn(
          `reCAPTCHA action mismatch: expected "${action}", got "${payload.action}"`,
        );
        throw new UnauthorizedException('Invalid reCAPTCHA action');
      }

      if (
        typeof payload.score === 'number' &&
        payload.score < this.minScore
      ) {
        this.logger.warn(
          `reCAPTCHA score ${payload.score} below threshold ${this.minScore}`,
        );
        throw new UnauthorizedException('Low reCAPTCHA confidence score');
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error('reCAPTCHA verification error', err as Error);
      throw new ServiceUnavailableException(
        'Unable to verify reCAPTCHA at this time',
      );
    }
  }
}

