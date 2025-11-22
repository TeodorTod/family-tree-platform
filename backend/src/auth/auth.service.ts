import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { addMinutes, isBefore } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from 'src/mailer/mailer.service';
import * as crypto from 'crypto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type LanguageCode = 'bg' | 'en';

const PASSWORD_ERROR_MESSAGES = {
  USER_NOT_FOUND: {
    en: 'User not found',
    bg: 'Потребителят не е намерен.',
  },
  PASSWORD_LOGIN_DISABLED: {
    en: 'Password login is not enabled for this account.',
    bg: 'Вход с парола не е активиран за този акаунт.',
  },
  CURRENT_PASSWORD_INCORRECT: {
    en: 'Current password is incorrect',
    bg: 'Текущата парола е грешна.',
  },
  PASSWORD_SAME_AS_OLD: {
    en: 'New password must be different from the current password.',
    bg: 'Новата парола трябва да е различна от текущата.',
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await this.usersService.validatePassword(user, pass))) {
      return this.usersService.toPublicUser(user);
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    const fresh = await this.usersService.findById(user.id);
    const safeUser = this.usersService.toPublicUser(fresh ?? user);
    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
    };
  }

  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  async createUser(email: string, password: string, language: LanguageCode) {
    return this.usersService.createLocalUser(email, password, email, language);
  }

  async updateUserLanguage(userId: string, language: LanguageCode) {
    return this.usersService.updateLanguage(userId, language);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    language: LanguageCode = 'en',
  ) {
    const user = await this.usersService.findById(userId);
    const lang = this.normalizeLanguage(user?.language ?? language);
    if (!user) {
      throw new BadRequestException(
        this.passwordError('USER_NOT_FOUND', lang),
      );
    }

    if (!user.password) {
      throw new BadRequestException(
        this.passwordError('PASSWORD_LOGIN_DISABLED', lang),
      );
    }

    const isValid = await this.usersService.validatePassword(
      user,
      currentPassword,
    );
    if (!isValid) {
      throw new BadRequestException(
        this.passwordError('CURRENT_PASSWORD_INCORRECT', lang),
      );
    }

    const sameAsOld = await this.usersService.validatePassword(
      user,
      newPassword,
    );
    if (sameAsOld) {
      throw new BadRequestException(
        this.passwordError('PASSWORD_SAME_AS_OLD', lang),
      );
    }

    await this.usersService.updatePassword(userId, newPassword);
  }

  async deleteAccount(userId: string) {
    await this.usersService.deleteUser(userId);
  }

  async issuePasswordReset(email: string, locale: LanguageCode = 'bg') {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: addMinutes(new Date(), 30) },
    });

    const base = process.env.FRONTEND_URL ?? 'https://example.invalid';
    const resetUrl = `${base}/auth/reset?token=${rawToken}`;

    try {
      await this.mailer.sendPasswordResetEmail(user.email, resetUrl, locale);
    } catch (e) {
      console.error('Password reset email failed:', (e as any)?.message || e);
    }
  }

  async resetPasswordWithToken(rawToken: string, newPassword: string) {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let match: { id: string; userId: string; expiresAt: Date } | null = null;

    for (const t of tokens) {
      const ok = await bcrypt.compare(rawToken, t.tokenHash);
      if (ok) {
        match = t;
        break;
      }
    }

    if (!match || isBefore(match.expiresAt, new Date())) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    await this.usersService.updatePassword(match.userId, newPassword);

    await this.prisma.passwordResetToken.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: match.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
  }

  private passwordError(
    key: keyof typeof PASSWORD_ERROR_MESSAGES,
    language: LanguageCode,
  ): string {
    return (
      PASSWORD_ERROR_MESSAGES[key][language] ??
      PASSWORD_ERROR_MESSAGES[key].en
    );
  }

  private normalizeLanguage(value?: string | null): LanguageCode {
    return value === 'bg' ? 'bg' : 'en';
  }
}
