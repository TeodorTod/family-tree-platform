import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  SUBSCRIPTION_PLAN_DURATIONS,
  SubscriptionPlanCode,
} from 'src/shared/enums/subscription-plan.enum';
import { SUBSCRIPTION_SOURCE } from 'src/shared/enums/subscription-source.enum';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly userSummarySelect =
    Prisma.validator<Prisma.UserSelect>()({
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
      language: true,
      subscriptionPlan: true,
      subscriptionStartAt: true,
      subscriptionEndAt: true,
      subscriptionSource: true,
      userSettings: {
        select: {
          allowAdminSupportAccess: true,
        },
      },
    });

  async getUserSummaries() {
    const [users, memberStats, profileMembers] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: AdminService.userSummarySelect,
      }),
      this.prisma.familyMember.groupBy({
        by: ['userId'],
        orderBy: { userId: 'asc' },
        _count: { _all: true },
        _max: { updatedAt: true, createdAt: true },
      }),
      this.prisma.memberProfile.findMany({
        select: {
          memberId: true,
          member: { select: { userId: true } },
        },
      }),
    ]);

    const profileCountMap = new Map<string, number>();
    for (const entry of profileMembers) {
      const userId = entry.member.userId;
      profileCountMap.set(userId, (profileCountMap.get(userId) ?? 0) + 1);
    }

    const statsMap = new Map<
      string,
      { count: number; lastChange: Date | null }
    >();

    for (const stat of memberStats) {
      const updatedAt = stat._max?.updatedAt ?? null;
      const createdAt = stat._max?.createdAt ?? null;
      let count = 0;
      if (typeof stat._count === 'object' && stat._count) {
        count = stat._count._all ?? 0;
      } else if (typeof stat._count === 'number') {
        count = stat._count;
      }
      statsMap.set(stat.userId, {
        count,
        lastChange: updatedAt ?? createdAt ?? null,
      });
    }

    return users.map(({ userSettings, ...user }) => {
      const stats = statsMap.get(user.id);
      const memberCount = stats?.count ?? 0;
      const profileCount = profileCountMap.get(user.id) ?? 0;
      const allowAdminSupportAccess = userSettings?.allowAdminSupportAccess;
      return {
        ...user,
        allowAdminSupportAccess: allowAdminSupportAccess ?? false,
        memberCount,
        profileCount,
        dataRecords: memberCount + profileCount,
        lastMemberChangeAt: stats?.lastChange ?? null,
      };
    });
  }

  async getUserMembers(userId: string) {
    const [user, settings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      }),
      this.prisma.userSettings.findUnique({
        where: { userId },
        select: { allowAdminSupportAccess: true },
      }),
    ]);
    if (!settings?.allowAdminSupportAccess && user?.isAdmin !== true) {
      throw new ForbiddenException(
        'Admin support access is disabled for this account.',
      );
    }
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        relationLabel: true,
        gender: true,
        isAlive: true,
        birthYear: true,
        deathYear: true,
        dob: true,
        dod: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { id: true } },
      },
    });

    return members.map(({ profile, ...member }) => ({
      ...member,
      hasProfile: !!profile,
      dataUsage: 1 + (profile ? 1 : 0),
    }));
  }

  async updateUserSubscription(userId: string, plan: SubscriptionPlanCode) {
    const startAt = new Date();
    const months = SUBSCRIPTION_PLAN_DURATIONS[plan];
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + months);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStartAt: startAt,
        subscriptionEndAt: endAt,
        subscriptionSource: SUBSCRIPTION_SOURCE.ADMIN,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
        language: true,
        subscriptionPlan: true,
        subscriptionStartAt: true,
        subscriptionEndAt: true,
        subscriptionSource: true,
      },
    });
  }
}
