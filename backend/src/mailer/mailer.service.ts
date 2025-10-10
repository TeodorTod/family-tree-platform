import { Injectable, Logger } from '@nestjs/common';
import {
  TransactionalEmailsApi,
  SendSmtpEmail,
  TransactionalEmailsApiApiKeys,
  AccountApi,
  AccountApiApiKeys,
} from '@getbrevo/brevo';

type SendEmailOptions = {
  to:
    | { email: string; name?: string }
    | Array<{ email: string; name?: string }>;
  subject?: string;
  html?: string;
  text?: string;
  tags?: string[];
  headers?: Record<string, string>;
  // For templates:
  templateId?: number;
  params?: Record<string, any>;
  replyTo?: { email: string; name?: string };
  sender?: { email: string; name?: string };
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly api: TransactionalEmailsApi;
  private readonly defaultSender: { email: string; name?: string };
  private readonly defaultReplyTo?: { email: string; name?: string };

  constructor() {
    this.api = new TransactionalEmailsApi();

    const raw = process.env.BREVO_API_KEY;
    const apiKey = raw?.trim(); // ✅ trim spaces/newlines
    this.logger.log(
      `BREVO key present=${!!apiKey} prefix=${apiKey?.slice(0, 12) ?? 'NONE'}`,
    );
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is not set. Emails will fail.');
    }
    this.api.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey || '');

    // (optional) one-time self-check: confirm the key actually works
    if (apiKey) {
      const acct = new AccountApi();
      acct.setApiKey(AccountApiApiKeys.apiKey, apiKey);
      acct
        .getAccount()
        .then((res) =>
          this.logger.log(
            `Brevo account OK: ${res.body?.companyName ?? 'no-name'}`,
          ),
        )
        .catch((e) =>
          this.logger.error(
            `Brevo key invalid (401 expected here): ${e?.message || e}`,
          ),
        );
    }

    this.defaultSender = {
      email: (process.env.BREVO_SENDER_EMAIL || 'redacted@example.invalid').trim(),
      name: (process.env.BREVO_SENDER_NAME || 'App').trim(),
    };
    if (process.env.BREVO_REPLYTO_EMAIL) {
      this.defaultReplyTo = {
        email: process.env.BREVO_REPLYTO_EMAIL.trim(),
        name: (process.env.BREVO_REPLYTO_NAME || '').trim(),
      };
    }
  }

  async send(opts: SendEmailOptions): Promise<void> {
    const to = Array.isArray(opts.to) ? opts.to : [opts.to];

    const payload: SendSmtpEmail = {
      to: to.map((t) => ({ email: t.email, name: t.name })),
      sender: opts.sender || this.defaultSender,
      replyTo: opts.replyTo || this.defaultReplyTo,
      headers: opts.headers,
      tags: opts.tags,
    };

    if (opts.templateId) {
      payload.templateId = opts.templateId;
      payload.params = opts.params;
    } else {
      payload.subject = opts.subject || '';
      if (opts.html) payload.htmlContent = opts.html;
      if (opts.text) payload.textContent = opts.text;
      if (!payload.subject || (!payload.htmlContent && !payload.textContent)) {
        throw new Error(
          'Either templateId or (subject + html/text) must be provided',
        );
      }
    }

    try {
      await this.api.sendTransacEmail(payload);
    } catch (err: any) {
      this.logger.error(
        `Brevo sendTransacEmail failed: ${err?.message || err}`,
      );
      throw err;
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    resetUrl: string,
    locale: 'bg' | 'en' = 'bg',
  ) {
    const subject =
      locale === 'bg' ? 'Промяна на парола' : 'Reset your password';
    const html =
      locale === 'bg'
        ? `
          <p>Заявихте промяна на паролата. Линкът е валиден 30 минути:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Ако не сте инициирали тази заявка, игнорирайте това съобщение.</p>
        `
        : `
          <p>You requested a password reset. The link is valid for 30 minutes:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
        `;

    await this.send({
      to: { email: toEmail },
      subject,
      html,
      tags: ['password-reset'],
    });
  }
}
