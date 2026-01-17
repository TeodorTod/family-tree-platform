import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SubscriptionPlanCode } from 'src/shared/enums/subscription-plan.enum';
import {
  SubscriptionSource,
  SUBSCRIPTION_SOURCE,
} from 'src/shared/enums/subscription-source.enum';
import { isAdminEmail } from '../shared/constants/admin.constants';

type LanguageCode = 'bg' | 'en';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async validatePassword(user: { password: string | null }, pass: string) {
    if (!user.password) return false;
    return bcrypt.compare(pass, user.password);
  }

  async createLocalUser(
    email: string,
    password: string,
    displayName: string,
    language: LanguageCode = 'bg',
  ) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashed,
        displayName,
        provider: 'local',
        language,
      },
    });
  }

  async createOAuthUser(
    email: string,
    name: string,
    picture: string,
    language: LanguageCode = 'bg',
  ) {
    return this.prisma.user.create({
      data: {
        email,
        displayName: name,
        picture,
        provider: 'google',
        language,
      },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  async updateLanguage(userId: string, language: LanguageCode) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { language },
    });
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string | null },
  ) {
    const payload: { displayName?: string | null } = {};
    if (data.displayName !== undefined) {
      const trimmed = data.displayName?.trim();
      payload.displayName = trimmed ? trimmed : null;
    }

    if (Object.keys(payload).length === 0) {
      const user = await this.findById(userId);
      return this.toPublicUser(user);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: payload,
    });
    return this.toPublicUser(updated);
  }

  async updateSubscription(
    userId: string,
    plan: SubscriptionPlanCode,
    startAt: Date,
    endAt: Date,
    source: SubscriptionSource = SUBSCRIPTION_SOURCE.PAID,
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStartAt: startAt,
        subscriptionEndAt: endAt,
        subscriptionSource: source,
      },
    });
    return this.toPublicUser(updated);
  }

  toPublicUser<
    T extends { password?: string | null; email?: string | null },
  >(
    user: T | null,
  ): (Omit<T, 'password'> & { hasPassword: boolean; isAdmin: boolean }) | null {
    if (!user) {
      return null;
    }
    const { password, ...rest } = user as T & {
      password?: string | null;
      email?: string | null;
    };
    return {
      ...(rest as Omit<T, 'password'>),
      hasPassword: !!password,
      isAdmin: isAdminEmail(rest.email),
    };
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
