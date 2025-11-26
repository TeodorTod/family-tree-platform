import { Injectable, Logger } from '@nestjs/common';
import { ContactMessageDto } from './dto/contact-message.dto';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { ContactTopic } from './contact-topic.enum';

type ContactPayload = Omit<ContactMessageDto, 'recaptchaToken'>;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly recipient: string;

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.recipient =
      this.config.get<string>('CONTACT_FORM_RECIPIENT')?.trim() ||
      'redacted@example.invalid';
  }

  async submit(dto: ContactMessageDto): Promise<void> {
    const { recaptchaToken, ...message } = dto;
    await this.mailer.send({
      to: { email: this.recipient },
      subject: this.buildSubject(message.lang),
      html: this.buildHtml(message),
      replyTo: { email: message.email, name: message.fullName },
      tags: ['contact-form'],
    });
  }

  private buildSubject(lang?: 'bg' | 'en') {
    return lang === 'bg'
      ? 'Ново запитване от контакт формата'
      : 'New contact form submission';
  }

  private buildHtml(message: ContactPayload) {
    const safeMessage = this.escape(message.message).replace(/\n/g, '<br>');
    const topicLabel = this.topicLabel(message.topic, message.lang);
    const consent = message.consent ? 'Yes' : 'No';

    return `
      <h2>Contact message from ${this.escape(message.fullName)}</h2>
      <p><strong>Email:</strong> ${this.escape(message.email)}</p>
      <p><strong>Preferred language:</strong> ${message.lang || 'n/a'}</p>
      <p><strong>Topic:</strong> ${topicLabel}</p>
      <p><strong>Consent given:</strong> ${consent}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    `;
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private topicLabel(topic: ContactTopic, lang?: 'bg' | 'en') {
    const labels: Record<ContactTopic, { en: string; bg: string }> = {
      [ContactTopic.SUPPORT]: {
        en: 'Support',
        bg: 'Поддръжка',
      },
      [ContactTopic.BILLING]: {
        en: 'Billing',
        bg: 'Плащания',
      },
      [ContactTopic.SUGGESTION]: {
        en: 'Suggestion',
        bg: 'Предложение',
      },
      [ContactTopic.OTHER]: {
        en: 'Other',
        bg: 'Друго',
      },
    };

    return labels[topic]?.[lang ?? 'en'] ?? topic;
  }
}

