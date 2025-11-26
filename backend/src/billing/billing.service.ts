import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  SUBSCRIPTION_PLAN,
  SubscriptionPlanCode,
} from 'src/shared/enums/subscription-plan.enum';
import { UsersService } from 'src/users/users.service';

type PlanMap = Map<SubscriptionPlanCode, string>;

type SubscriptionContext = {
  subscriptionId: string;
  planHint?: string | null;
  userHint?: string | null;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null = null;
  private readonly planToPrice: PlanMap = new Map();
  private readonly priceToPlan: Map<string, SubscriptionPlanCode> =
    new Map();
  private readonly webhookSecret: string | undefined;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.enabled = false;
      this.logger.warn(
        'Stripe billing disabled because STRIPE_SECRET_KEY is not configured.',
      );
      return;
    }

    this.stripe = new Stripe(secretKey);
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    this.enabled = true;
    this.registerPlanPrices();
  }

  async createCheckoutSession(params: {
    plan: SubscriptionPlanCode;
    userId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    this.ensureEnabled();
    const { plan, userId, customerEmail, successUrl, cancelUrl } =
      params;
    const priceId = this.requirePriceForPlan(plan);

    const session = await this.stripe!.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: userId,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    return { id: session.id };
  }

  async handleWebhook(payload: Buffer, signature?: string) {
    this.ensureEnabled();
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header.');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Stripe signature verification failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('Invalid Stripe signature.');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          await this.syncSubscription({
            subscriptionId: session.subscription.toString(),
            planHint: session.metadata?.plan,
            userHint: session.metadata?.userId,
          });
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = this.subscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await this.syncSubscription({
            subscriptionId,
            planHint: this.priceFromInvoice(invoice),
            userHint: invoice.metadata?.userId,
          });
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
    const enriched = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const raw = enriched.subscription;
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      return raw;
    }
    return raw.id;
  }

  private priceFromInvoice(invoice: Stripe.Invoice) {
    const line = invoice.lines.data?.[0] as Stripe.InvoiceLineItem & {
      price?: Stripe.Price | null;
    };
    return line?.price?.id ?? undefined;
  }

  private registerPlanPrices() {
    if (!this.enabled) {
      return;
    }
    const planEntries: Array<[SubscriptionPlanCode, string | undefined]> =
      [
        [SUBSCRIPTION_PLAN.SIX_MONTHS, this.config.get('STRIPE_PRICE_SIX_MONTHS')],
        [SUBSCRIPTION_PLAN.ONE_YEAR, this.config.get('STRIPE_PRICE_ONE_YEAR')],
        [SUBSCRIPTION_PLAN.TWO_YEARS, this.config.get('STRIPE_PRICE_TWO_YEARS')],
      ];

    for (const [plan, priceId] of planEntries) {
      if (!priceId) {
        throw new Error(`Stripe price is not configured for plan ${plan}`);
      }
      this.planToPrice.set(plan, priceId);
      this.priceToPlan.set(priceId, plan);
    }
  }

  private requirePriceForPlan(plan: SubscriptionPlanCode) {
    const priceId = this.planToPrice.get(plan);
    if (!priceId) {
      throw new BadRequestException(
        `Stripe price missing for plan ${plan}`,
      );
    }
    return priceId;
  }

  private planFromHint(
    hint?: string | null,
  ): SubscriptionPlanCode | undefined {
    if (!hint) {
      return undefined;
    }

    if (this.priceToPlan.has(hint)) {
      return this.priceToPlan.get(hint);
    }

    if (
      Object.values(SUBSCRIPTION_PLAN).includes(
        hint as SubscriptionPlanCode,
      )
    ) {
      return hint as SubscriptionPlanCode;
    }

    return undefined;
  }

  private async syncSubscription(context: SubscriptionContext) {
    try {
      const subscription = await this.fetchSubscription(
        context.subscriptionId,
      );

      const userId =
        (subscription.metadata?.userId as string | undefined) ??
        context.userHint ??
        undefined;
      if (!userId) {
        this.logger.warn(
          `Stripe subscription ${subscription.id} missing user reference.`,
        );
        return;
      }

      const priceId =
        subscription.items.data?.[0]?.price?.id ??
        context.planHint ??
        undefined;
      const plan =
        this.planFromHint(subscription.metadata?.plan) ??
        this.planFromHint(priceId) ??
        this.planFromHint(context.planHint);
      if (!plan) {
        this.logger.warn(
          `Unable to resolve subscription plan for ${subscription.id}`,
        );
        return;
      }

      const period = subscription as Stripe.Subscription & {
        current_period_start: number;
        current_period_end: number;
      };
      const start = new Date(period.current_period_start * 1000);
      const end = new Date(period.current_period_end * 1000);

      await this.users.updateSubscription(userId, plan, start, end);
      this.logger.log(
        `Subscription for user ${userId} updated to ${plan}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Stripe subscription: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private async fetchSubscription(subscriptionId: string) {
    const subscription = await this.stripe!.subscriptions.retrieve(
      subscriptionId,
    );
    return subscription as Stripe.Subscription;
  }

  private ensureEnabled(): void {
    if (!this.enabled || !this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe billing is not configured.',
      );
    }
  }
}
