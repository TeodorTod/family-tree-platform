import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShareRequestStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMemberConsentDto } from './dto/upsert-member-consent.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { CreateShareRequestDto } from './dto/create-share-request.dto';

@Injectable()
export class SharingService {
  constructor(private prisma: PrismaService) {}

  async getMySettings(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return {
      allowDeceasedDiscoveryDefault: s?.allowDeceasedDiscoveryDefault ?? true,
      allowDeceasedDetailsDefault: s?.allowDeceasedDetailsDefault ?? false,
    };
  }

  async updateMySettings(userId: string, dto: UpdateUserSettingsDto) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        allowDeceasedDiscoveryDefault:
          dto.allowDeceasedDiscoveryDefault ?? undefined,
        allowDeceasedDetailsDefault:
          dto.allowDeceasedDetailsDefault ?? undefined,
      },
      create: {
        userId,
        allowDeceasedDiscoveryDefault:
          dto.allowDeceasedDiscoveryDefault ?? true,
        allowDeceasedDetailsDefault: dto.allowDeceasedDetailsDefault ?? false,
      },
    });
    return this.getMySettings(userId);
  }

  async getMyMembersConsent(userId: string) {
    const [members, settings, consents] = await Promise.all([
      this.prisma.familyMember.findMany({
        where: { userId, isAlive: false },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.userSettings.findUnique({ where: { userId } }),
      this.prisma.memberShareConsent.findMany({ where: { ownerUserId: userId } }),
    ]);

    const byMember = new Map(consents.map((c) => [c.memberId, c]));
    const defaults = {
      allowDeceasedDiscoveryDefault: settings?.allowDeceasedDiscoveryDefault ?? true,
      allowDeceasedDetailsDefault: settings?.allowDeceasedDetailsDefault ?? false,
    };
    return members.map((m) => {
      const c = byMember.get(m.id);
      return {
        memberId: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        allowDiscovery: c?.allowDiscovery ?? defaults.allowDeceasedDiscoveryDefault,
        allowDetails: c?.allowDetails ?? defaults.allowDeceasedDetailsDefault,
      };
    });
  }

  async upsertMyMembersConsent(userId: string, items: UpsertMemberConsentDto[]) {
    const ops: Prisma.PrismaPromise<any>[] = [];
    for (const i of items) {
      ops.push(
        this.prisma.memberShareConsent.upsert({
          where: { ownerUserId_memberId: { ownerUserId: userId, memberId: i.memberId } },
          update: { allowDiscovery: i.allowDiscovery, allowDetails: i.allowDetails },
          create: {
            ownerUserId: userId,
            memberId: i.memberId,
            allowDiscovery: i.allowDiscovery,
            allowDetails: i.allowDetails,
          },
        })
      );
    }
    await this.prisma.$transaction(ops);
    return { ok: true };
  }

  private async getEffectiveConsent(ownerUserId: string, memberId: string) {
    const [consent, settings] = await Promise.all([
      this.prisma.memberShareConsent.findUnique({
        where: { ownerUserId_memberId: { ownerUserId, memberId } },
      }),
      this.prisma.userSettings.findUnique({ where: { userId: ownerUserId } }),
    ]);
    const allowDiscovery = consent?.allowDiscovery ?? settings?.allowDeceasedDiscoveryDefault ?? true;
    const allowDetails = consent?.allowDetails ?? settings?.allowDeceasedDetailsDefault ?? false;
    return { allowDiscovery, allowDetails };
  }

  async createShareRequest(userId: string, dto: CreateShareRequestDto) {
    const target = await this.prisma.familyMember.findUnique({ where: { id: dto.targetMemberId } });
    if (!target || target.isAlive) throw new BadRequestException('Invalid target');
    if (target.userId === userId) throw new BadRequestException('Own member');

    const eff = await this.getEffectiveConsent(target.userId, target.id);
    if (!eff.allowDiscovery) throw new ForbiddenException('Not discoverable');

    const existing = await this.prisma.shareRequest.findFirst({
      where: { requesterUserId: userId, targetMemberId: target.id, status: ShareRequestStatus.PENDING },
    });
    if (existing) throw new BadRequestException('Already pending');

    return this.prisma.shareRequest.create({
      data: {
        requesterUserId: userId,
        targetMemberId: target.id,
        message: dto.message ?? undefined,
        status: ShareRequestStatus.PENDING,
      },
    });
  }

  async listIncoming(userId: string) {
    return this.prisma.shareRequest.findMany({
      where: {
        status: { in: [ShareRequestStatus.PENDING, ShareRequestStatus.APPROVED] },
        target: { userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        requesterUserId: true,
        targetMemberId: true,
        message: true,
        createdAt: true,
        requester: {
          select: {
            displayName: true,
            familyMembers: {
              where: { role: 'owner' },
              select: { firstName: true, lastName: true },
              take: 1,
            },
          },
        },
        target: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async listOutgoing(userId: string) {
    return this.prisma.shareRequest.findMany({
      where: { requesterUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        message: true,
        targetMemberId: true,
        createdAt: true,
        target: {
          select: {
            firstName: true,
            lastName: true,
            userId: true,
            birthYear: true,
            deathYear: true,
            user: { select: { displayName: true } },
          },
        },
      },
    });
  }

  private async generateUniqueRole(userId: string, base: string) {
    const prefix = base.toLowerCase();
    let attempt = 0;
    while (attempt < 100) {
      const candidate = attempt === 0 ? prefix : `${prefix}_${attempt + 1}`;
      if (candidate === 'owner') {
        attempt++;
        continue;
      }
      const exists = await this.prisma.familyMember.findFirst({ where: { userId, role: candidate } });
      if (!exists) return candidate;
      attempt++;
    }
    throw new BadRequestException('Cannot allocate role');
  }

  private nowUtc() {
    return new Date(new Date().toISOString());
  }

  async cloneMemberToUser(targetMemberId: string, toUserId: string) {
    const source = await this.prisma.familyMember.findUnique({
      where: { id: targetMemberId },
      include: { profile: true },
    });
    if (!source) throw new NotFoundException('Not found');
    if (source.userId === toUserId) throw new BadRequestException('Already owned');
    if (source.isAlive) throw new BadRequestException('Only deceased');

    const roleBase = `imported_${source.id.slice(0, 8)}`;
    const newRole = await this.generateUniqueRole(toUserId, roleBase);

    const created = await this.prisma.$transaction(async (tx) => {
      const fm = await tx.familyMember.create({
        data: {
          userId: toUserId,
          firstName: source.firstName,
          middleName: source.middleName ?? undefined,
          lastName: source.lastName,
          gender: source.gender ?? undefined,
          dob: source.dob ?? undefined,
          birthYear: source.birthYear ?? undefined,
          birthNote: source.birthNote ?? undefined,
          dod: source.dod ?? undefined,
          deathYear: source.deathYear ?? undefined,
          deathNote: source.deathNote ?? undefined,
          isAlive: source.isAlive,
          photoUrl: source.photoUrl ?? undefined,
          role: newRole,
          relationLabel: null,
          translatedRole: null,
          partnerId: null,
          partnerStatus: null,
          copiedFromMemberId: source.id,
          copiedSnapshotAt: this.nowUtc(),
        },
      });

      if (source.profile) {
        await tx.memberProfile.create({
          data: {
            memberId: fm.id,
            bio: source.profile.bio ?? undefined,
            coverMediaUrl: source.profile.coverMediaUrl ?? undefined,
            achievements: source.profile.achievements ?? undefined,
            facts: source.profile.facts ?? undefined,
            favorites: source.profile.favorites ?? undefined,
            education: source.profile.education ?? undefined,
            work: source.profile.work ?? undefined,
            stories: source.profile.stories ?? undefined,
            personalInfo: source.profile.personalInfo ?? undefined,
            notes: source.profile.notes ?? undefined,
          },
        });
      }

      return fm;
    });

    return created.id;
  }

  async decide(userId: string, id: string, status: 'APPROVED' | 'REJECTED') {
    const req = await this.prisma.shareRequest.findUnique({
      where: { id },
      include: { target: true },
    });
    if (!req) throw new NotFoundException('Not found');
    if (req.target.userId !== userId) throw new ForbiddenException('Not owner');
    if (req.status !== ShareRequestStatus.PENDING) throw new BadRequestException('Already decided');

    if (status === 'APPROVED') {
      await this.prisma.shareRequest.update({
        where: { id },
        data: { status: ShareRequestStatus.APPROVED, decidedAt: this.nowUtc(), decidedByUserId: userId },
      });
      // Do not clone at approval time; cloning happens when requester adds to their tree.
      return { ok: true };
    }

    await this.prisma.shareRequest.update({
      where: { id },
      data: { status: ShareRequestStatus.REJECTED, decidedAt: this.nowUtc(), decidedByUserId: userId },
    });
    return { ok: true };
  }

  async cloneDirect(userId: string, targetMemberId: string) {
    const target = await this.prisma.familyMember.findUnique({ where: { id: targetMemberId } });
    if (!target || target.isAlive) throw new BadRequestException('Invalid target');
    const eff = await this.getEffectiveConsent(target.userId, target.id);
    if (!eff.allowDetails) throw new ForbiddenException('Details not allowed');
    const id = await this.cloneMemberToUser(targetMemberId, userId);
    return { newMemberId: id };
  }

  async cloneApproved(userId: string, requestId: string) {
    const req = await this.prisma.shareRequest.findFirst({
      where: { id: requestId, requesterUserId: userId },
      include: { target: true },
    });
    if (!req) throw new NotFoundException('Not found');
    if (req.status !== ShareRequestStatus.APPROVED) throw new BadRequestException('Not approved');
    const existing = await this.prisma.familyMember.findFirst({
      where: { userId, copiedFromMemberId: req.targetMemberId },
      select: { id: true },
    });
    if (existing) {
      // Ensure profile is duplicated if missing
      const [existingProfile, sourceProfile] = await Promise.all([
        this.prisma.memberProfile.findUnique({ where: { memberId: existing.id } }),
        this.prisma.memberProfile.findUnique({ where: { memberId: req.targetMemberId } }),
      ]);
      if (!existingProfile && sourceProfile) {
        await this.prisma.memberProfile.create({
          data: {
            memberId: existing.id,
            bio: sourceProfile.bio ?? undefined,
            coverMediaUrl: sourceProfile.coverMediaUrl ?? undefined,
            achievements: sourceProfile.achievements ?? undefined,
            facts: sourceProfile.facts ?? undefined,
            favorites: sourceProfile.favorites ?? undefined,
            education: sourceProfile.education ?? undefined,
            work: sourceProfile.work ?? undefined,
            stories: sourceProfile.stories ?? undefined,
            personalInfo: sourceProfile.personalInfo ?? undefined,
            notes: sourceProfile.notes ?? undefined,
          },
        });
      }
      return { newMemberId: existing.id };
    }
    const id = await this.cloneMemberToUser(req.targetMemberId, userId);
    return { newMemberId: id };
  }
}
