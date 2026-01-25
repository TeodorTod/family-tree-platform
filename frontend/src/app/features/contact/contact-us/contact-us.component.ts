import {
  Component,
  DestroyRef,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { CONSTANTS } from '../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ContactService } from './contact.service';
import { startWith, switchMap, finalize } from 'rxjs';
import {
  ContactTopic,
  ContactMessageDto,
} from '../../../shared/types/contact.types';
import {
  RecaptchaException,
  RecaptchaService,
} from '../../../core/services/recaptcha.service';

const MAX_MESSAGE_LEN = 2000;

@Component({
  selector: 'app-contact-us',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    FieldsetModule,
    CardModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    ButtonModule,
  ],
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUsComponent implements OnDestroy {
  CONSTANTS = CONSTANTS;

  private title = inject(Title);
  private translate = inject(TranslateService);
  private msg = inject(MessageService);
  private api = inject(ContactService);
  private destroyRef = inject(DestroyRef);
  private recaptcha = inject(RecaptchaService);

  submitting = signal(false);
  maxLen = MAX_MESSAGE_LEN;

  form = this.api.contactForm;

  // counters
  private messageSig = toSignal(
    this.form.controls.message.valueChanges.pipe(
      startWith(this.form.controls.message.value ?? '')
    ),
    { initialValue: '' }
  );
  messageLen = computed(() => this.messageSig()?.length ?? 0);
  remaining = computed(() => Math.max(0, this.maxLen - this.messageLen()));

  // topics
  topics = signal<{ label: string; value: ContactTopic }[]>([]);
  private topicOptions = (): { label: string; value: ContactTopic }[] => [
    {
      label: this.translate.instant(CONSTANTS.CONTACT_TOPIC_SUPPORT),
      value: 'support',
    },
    {
      label: this.translate.instant(CONSTANTS.CONTACT_TOPIC_BILLING),
      value: 'billing',
    },
    {
      label: this.translate.instant(CONSTANTS.CONTACT_TOPIC_SUGGESTION),
      value: 'suggestion',
    },
    {
      label: this.translate.instant(CONSTANTS.CONTACT_TOPIC_OTHER),
      value: 'other',
    },
  ];

  constructor() {
    this.setPageTitle();

    this.topics.set(this.topicOptions());
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.setPageTitle();
        this.topics.set(this.topicOptions());
      });

    // enforce max on paste/overrun
    effect(() => {
      const val = this.form.controls.message.value ?? '';
      if (val.length > this.maxLen) {
        this.form.controls.message.setValue(val.slice(0, this.maxLen), {
          emitEvent: false,
        });
      }
    });
  }

  submit(): void {
    if (this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.add({
        severity: 'warn',
        summary: this.translate.instant(CONSTANTS.COMMON_VALIDATION),
        detail: this.translate.instant(CONSTANTS.CONTACT_MESSAGE_ERR),
        life: 3500,
      });
      return;
    }

    this.submitting.set(true);

    this.recaptcha
      .execute('contact')
      .pipe(
        switchMap((token) => {
          const payload: ContactMessageDto = {
            fullName: this.form.value.fullName!.trim(),
            email: this.form.value.email!.trim(),
            topic: this.form.value.topic as ContactMessageDto['topic'],
            message: this.form.value.message!.trim(),
            consent: !!this.form.value.consent,
            lang: this.translate.currentLang || 'bg',
            recaptchaToken: token,
          };
          return this.api.send(payload);
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.msg.add({
            severity: 'success',
            summary: this.translate.instant(CONSTANTS.CONTACT_SENT_TITLE),
            detail: this.translate.instant(CONSTANTS.CONTACT_SENT_DESC),
            life: 4000,
          });
          this.form.reset({ consent: false });
        },
        error: (err) => {
          if (err instanceof RecaptchaException) {
            this.msg.add({
              severity: 'warn',
              summary: this.translate.instant(CONSTANTS.COMMON_VALIDATION),
              detail: this.translate.instant(CONSTANTS.COMMON_RECAPTCHA_FAILED),
              life: 4000,
            });
            return;
          }

          console.error('[Contact] send error:', err);
          this.msg.add({
            severity: 'error',
            summary: this.translate.instant(CONSTANTS.COMMON_ERROR),
            detail: this.translate.instant(CONSTANTS.CONTACT_ERROR_DESC),
            life: 5000,
          });
        },
      });
  }

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.get(name as string);
    return !!c && c.touched && c.invalid;
  }

  onKeyDownSubmit(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    const isTextArea = target?.tagName?.toLowerCase() === 'textarea';
    if (!isTextArea && ev.key === 'Enter') {
      ev.preventDefault();
      this.submit();
    }
  }

  private setPageTitle(): void {
    const t = this.translate.instant(CONSTANTS.CONTACT_TITLE) + ' â€¢ Rodostoria';
    this.title.setTitle(t);
  }

  ngOnDestroy(): void {
    this.recaptcha.cleanup();
  }
}
