import { Injectable } from '@nestjs/common';
import { ShareRequestStatus } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';

@Injectable()
export class GlobalSearchService {
  constructor(private prisma: PrismaService) {}

  private normalizeText(q?: string) {
    return (q ?? '').trim();
  }

  async searchDeceased(userId: string, dto: SearchQueryDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 20;
    const q = this.normalizeText(dto.q);

    const whereBase: any = { isAlive: false };
    if (q) {
      whereBase.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(size * 3, 50), 300);
    const skip = Math.max(page * size - size, 0);

    const candidates = await this.prisma.familyMember.findMany({
      where: whereBase,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        birthYear: true,
        deathYear: true,
        photoUrl: true,
        isAlive: true,
        user: { select: { displayName: true } },
      },
      orderBy: [{ deathYear: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take,
    });

    const ownerIds = Array.from(new Set(candidates.map((c) => c.userId)));
    const memberIds = candidates.map((c) => c.id);

    const [settings, consents, owners, existingRequests] = await Promise.all([
      this.prisma.userSettings.findMany({
        where: { userId: { in: ownerIds } },
        select: {
          userId: true,
          allowDeceasedDiscoveryDefault: true,
          allowDeceasedDetailsDefault: true,
        },
      }),
      this.prisma.memberShareConsent.findMany({
        where: { ownerUserId: { in: ownerIds }, memberId: { in: memberIds } },
        select: {
          ownerUserId: true,
          memberId: true,
          allowDiscovery: true,
          allowDetails: true,
        },
      }),
      this.prisma.familyMember.findMany({
        where: { userId: { in: ownerIds }, role: 'owner' },
        select: { userId: true, firstName: true, lastName: true },
      }),
      memberIds.length
        ? this.prisma.shareRequest.findMany({
            where: {
              requesterUserId: userId,
              targetMemberId: { in: memberIds },
              status: {
                in: [
                  ShareRequestStatus.PENDING,
                  ShareRequestStatus.APPROVED,
                  ShareRequestStatus.REJECTED,
                ],
              },
            },
            select: { targetMemberId: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    const settingsByOwner = new Map(
      settings.map((s) => [s.userId, s])
    );
    const consentByPair = new Map(
      consents.map((c) => [`${c.ownerUserId}:${c.memberId}`, c])
    );

    const ownerNameByUser = new Map(
      owners.map((o) => [
        o.userId,
        `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || null,
      ])
    );

    const existingByTarget = new Map<string, ShareRequestStatus>();
    for (const req of existingRequests) {
      existingByTarget.set(req.targetMemberId, req.status);
    }

    const results: SearchResultDto[] = [];
    for (const m of candidates) {
      if (m.userId === userId) {
        continue;
      }
      const key = `${m.userId}:${m.id}`;
      const consent = consentByPair.get(key);
      const cfg = settingsByOwner.get(m.userId);

      const allowDiscovery =
        consent?.allowDiscovery ?? cfg?.allowDeceasedDiscoveryDefault ?? true;
      if (!allowDiscovery) continue;

      const allowDetails =
        consent?.allowDetails ?? cfg?.allowDeceasedDetailsDefault ?? false;

      const existingStatus = existingByTarget.get(m.id) ?? null;
      const hasPendingRequest =
        existingStatus === ShareRequestStatus.PENDING ||
        existingStatus === ShareRequestStatus.APPROVED;

      const out: SearchResultDto = {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        birthYear: m.birthYear ?? null,
        deathYear: m.deathYear ?? null,
        photoUrl: m.photoUrl ?? null,
        requiresShareApproval: !allowDetails,
        ownerDisplayName: m.user.displayName ?? ownerNameByUser.get(m.userId) ?? null,
        hasPendingRequest,
        requestStatus: existingStatus,
      };
      results.push(out);
      if (results.length >= size) break;
    }

    return results;
  }
}
