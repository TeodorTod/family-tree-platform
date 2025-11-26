export type ContactTopic = 'support' | 'billing' | 'suggestion' | 'other';

export interface ContactMessageDto {
  fullName: string;
  email: string;
  topic: ContactTopic;
  message: string;
  consent: boolean;
  lang?: string;
  recaptchaToken: string;
}
