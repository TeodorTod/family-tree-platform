import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SubscriptionPlanCode } from 'src/shared/enums/subscription-plan.enum';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const successUrl =
      dto.successUrl ?? this.buildStatusUrl(dto.plan, 'success');
    const cancelUrl =
      dto.cancelUrl ?? this.buildStatusUrl(dto.plan, 'canceled');

    const session = await this.billing.createCheckoutSession({
      plan: dto.plan,
      userId: req.user.id,
      customerEmail: req.user.email,
      successUrl,
      cancelUrl,
    });

    return { sessionId: session.id };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billing.handleWebhook(req.body as Buffer, signature);
    return { received: true };
  }

  private buildStatusUrl(
    plan: SubscriptionPlanCode,
    status: 'success' | 'canceled',
  ) {
    const base =
      this.config.get<string>('FRONTEND_URL') ??
      'https://example.invalid';
    const params = new URLSearchParams({
      plan,
      status,
      returnUrl: '/settings/plans',
    });
    return `${base}/subscription/payment?${params.toString()}`;
  }
}
