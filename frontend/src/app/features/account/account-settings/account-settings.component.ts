import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { AccountService } from '../services/account.service';
import { AuthUser } from '../../../shared/models/user.model';
import { CONSTANTS } from '../../../shared/constants/constants';
import { Lang } from '../../../shared/types/lang.type';
import { LanguageService } from '../../../../assets/i18n/language.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/services/auth.service';
import { FamilyService } from '../../../core/services/family.service';
import { Roles } from '../../../shared/enums/roles.enum';

@Component({
  selector: 'app-account-settings',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    InputTextModule,
    MessageModule,
    ButtonModule,
    SelectModule,
    PasswordModule,
    TooltipModule,
    DialogModule,
  ],
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSettingsComponent implements OnInit {
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private account = inject(AccountService);
  private langService = inject(LanguageService);
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private familyService = inject(FamilyService);

  user = signal<AuthUser | null>(null);
  loadingProfile = signal(true);
  profileSaving = signal(false);
  languageSaving = signal(false);
  passwordSaving = signal(false);

  profileMessage = signal<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );
  languageMessage = signal<
    { severity: 'success' | 'error'; text: string } | null
  >(null);
  passwordMessage = signal<
    { severity: 'success' | 'error'; text: string } | null
  >(null);
  deleteDialogVisible = signal(false);
  deleteLoading = signal(false);
  deleteError = signal<string | null>(null);
  ownerName = signal<string>('');

  private readonly passwordErrorMap: Record<string, string> = {
    'Current password is incorrect': CONSTANTS.AUTH_ERROR_CURRENT_PASSWORD,
    'Текущата парола е грешна.': CONSTANTS.AUTH_ERROR_CURRENT_PASSWORD,
    'New password must be different from the current password.':
      CONSTANTS.AUTH_ERROR_PASSWORD_SAME,
    'Новата парола трябва да е различна от текущата.':
      CONSTANTS.AUTH_ERROR_PASSWORD_SAME,
  };

  private passwordsMatchValidator: ValidatorFn = (control: AbstractControl) => {
    const newPass = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (!newPass || !confirm) {
      return null;
    }
    return newPass === confirm ? null : { passwordsMismatch: true };
  };

  profileForm = this.fb.group({
    displayName: ['', [Validators.maxLength(120)]],
  });

  languageControl = new FormControl<Lang>(this.langService.current(), {
    nonNullable: true,
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/[a-z]/),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/\d/),
          Validators.pattern(/[^A-Za-z0-9]/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator },
  );

  languageOptions = signal<{ label: string; value: Lang }[]>([]);

  initials = computed(() => {
    const user = this.user();
    const fallbackOwner = this.ownerName().trim();
    const text = (
      user?.displayName ||
      fallbackOwner ||
      user?.email ||
      ''
    ).trim();
    if (!text) return '?';
    const parts = text.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  canChangePassword = computed(() => {
    const user = this.user();
    if (!user) return false;
    if (typeof user.hasPassword === 'boolean') {
      return user.hasPassword;
    }
    return !user.provider || user.provider === 'local';
  });

  ngOnInit(): void {
    this.refreshLangOptions();
    this.loadProfile();
    this.loadOwnerName();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshLangOptions());

    this.languageControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.languageMessage.set(null);
      });
  }

  formatLocalDate(
    value: string | Date | null | undefined,
    style: 'long' | 'medium' = 'long'
  ): string {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    const locale = this.languageControl.value || this.translate.currentLang || 'en';
    const options: Intl.DateTimeFormatOptions =
      style === 'long'
        ? { dateStyle: 'long' }
        : { dateStyle: 'medium', timeStyle: 'medium' };
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  get providerLabelKey() {
    return this.user()?.provider === 'google'
      ? CONSTANTS.ACCOUNT_SIGNIN_METHOD_GOOGLE
      : CONSTANTS.ACCOUNT_SIGNIN_METHOD_LOCAL;
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileSaving.set(true);
    this.profileMessage.set(null);
    const displayName = (this.profileForm.value.displayName ?? '').trim();

    this.account
      .updateProfile({ displayName: displayName || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.profileSaving.set(false);
          this.profileMessage.set({
            severity: 'success',
            text: this.translate.instant(CONSTANTS.ACCOUNT_PROFILE_UPDATED),
          });
          this.auth.refreshProfile();
        },
        error: (err) => {
          this.profileSaving.set(false);
          this.profileMessage.set({
            severity: 'error',
            text: this.resolveErrorMessage(
              err,
              CONSTANTS.ACCOUNT_PROFILE_UPDATE_ERROR,
            ),
          });
        },
      });
  }

  updateLanguage() {
    const lang = this.languageControl.value;
    if (!lang) return;
    if (this.user()?.language === lang) {
      this.languageMessage.set(null);
      return;
    }
    this.languageSaving.set(true);
    this.languageMessage.set(null);

    this.account
      .updateLanguage(lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.languageSaving.set(false);
          const user = this.user();
          if (user) {
            this.user.set({ ...user, language: lang });
          }
          this.langService.use(lang);
          this.languageMessage.set({
            severity: 'success',
            text: this.translate.instant(CONSTANTS.ACCOUNT_LANGUAGE_UPDATED),
          });
        },
        error: (err) => {
          this.languageSaving.set(false);
          this.languageMessage.set({
            severity: 'error',
            text: this.resolveErrorMessage(
              err,
              CONSTANTS.ACCOUNT_LANGUAGE_UPDATE_ERROR,
            ),
          });
        },
      });
  }

  changePassword() {
    if (!this.canChangePassword()) {
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } =
      this.passwordForm.value;
    if (!currentPassword || !newPassword || !confirmPassword) return;

    this.passwordSaving.set(true);
    this.passwordMessage.set(null);

    this.account
      .changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordSaving.set(false);
          this.passwordForm.reset();
          this.passwordMessage.set({
            severity: 'success',
            text: this.translate.instant(CONSTANTS.ACCOUNT_PASSWORD_UPDATED),
          });
        },
        error: (err) => {
          this.passwordSaving.set(false);
          this.passwordMessage.set({
            severity: 'error',
            text: this.resolveErrorMessage(
              err,
              CONSTANTS.ACCOUNT_PASSWORD_UPDATE_ERROR,
            ),
          });
        },
      });
  }

  openDeleteDialog() {
    this.deleteError.set(null);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog() {
    this.deleteDialogVisible.set(false);
    this.deleteError.set(null);
  }

  confirmDeleteAccount() {
    if (this.deleteLoading()) {
      return;
    }
    this.deleteLoading.set(true);
    this.deleteError.set(null);

    this.account
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteLoading.set(false);
          this.deleteDialogVisible.set(false);
          this.auth.logout();
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.deleteError.set(
            this.resolveErrorMessage(err, CONSTANTS.ACCOUNT_DELETE_ERROR),
          );
        },
      });
  }

  languageMatchesProfile() {
    const selection = this.languageControl.value;
    return (
      !selection || selection === (this.user()?.language as Lang | undefined)
    );
  }

  private refreshLangOptions() {
    this.languageOptions.set([
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_BG),
        value: 'bg',
      },
      {
        label: this.translate.instant(CONSTANTS.COMMON_LANG_EN),
        value: 'en',
      },
    ]);
  }

  private loadProfile() {
    this.loadingProfile.set(true);
    this.account
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.profileForm.patchValue({
            displayName: user.displayName ?? '',
          });
          const lang = (user.language as Lang) ?? this.langService.current();
          this.languageControl.setValue(lang, { emitEvent: false });
          this.loadingProfile.set(false);
          this.auth.refreshProfile();
        },
        error: (err) => {
          this.loadingProfile.set(false);
          this.profileMessage.set({
            severity: 'error',
            text: this.resolveErrorMessage(
              err,
              CONSTANTS.ACCOUNT_PROFILE_UPDATE_ERROR,
            ),
          });
        },
      });
  }

  private resolveErrorMessage(err: unknown, fallbackKey: string): string {
    const fallback = this.translate.instant(fallbackKey);
    if (!err) return fallback;
    const raw =
      (err as any)?.error?.message ??
      (err as any)?.message ??
      err;

    const resolved = this.normalizeErrorValue(raw);
    if (resolved) {
      const mapped = this.passwordErrorMap[resolved];
      if (mapped) {
        return this.translate.instant(mapped);
      }
      return resolved;
    }

    return fallback;
  }

  private normalizeErrorValue(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      const joined = value.filter((entry) => typeof entry === 'string').join(', ');
      return joined || null;
    }
    if (typeof value === 'object') {
      const inner = (value as any).message;
      if (typeof inner === 'string') {
        return inner;
      }
      if (Array.isArray(inner)) {
        const joined = inner
          .filter((entry) => typeof entry === 'string')
          .join(', ');
        return joined || null;
      }
    }
    return null;
  }

  private loadOwnerName(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.OWNER)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((owner) => {
        const fallback = [owner?.firstName, owner?.lastName]
          .filter((v) => !!(v && `${v}`.trim()))
          .join(' ')
          .trim();
        this.ownerName.set(fallback);

        const current = (this.profileForm.get('displayName')?.value ?? '')
          .toString()
          .trim();
        if (!current && fallback) {
          this.profileForm.patchValue(
            { displayName: fallback },
            { emitEvent: false }
          );
          this.profileForm.markAsPristine();
          this.profileForm.markAsUntouched();
        }
      });
  }
}
