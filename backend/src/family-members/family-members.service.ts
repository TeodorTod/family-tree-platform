import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { GetFamilyPagedDto } from './dto/get-family-page.dto';
import { PartnerStatus } from 'src/shared/enums/partner-status.enum';
import { GetMyTreeQuery } from './dto/get-my-tree.query';
import { Prisma } from 'generated/prisma';

const ALLOWED_FIELDS = new Set([
  'id',
  'role',
  'firstName',
  'middleName',
  'lastName',
  'gender',
  'dob',
  'birthYear',
  'birthNote',
  'dod',
  'deathYear',
  'deathNote',
  'isAlive',
  'photoUrl',
  'relationLabel',
  'translatedRole',
  'partnerId',
  'partnerStatus',
  'createdAt',
  'updatedAt',
]);

const DEFAULT_FIELDS = [
  'id',
  'role',
  'firstName',
  'lastName',
  'gender',
  'dob',
  'birthYear',
  'birthNote',
  'isAlive',
  'photoUrl',
  'partnerId',
  'partnerStatus',
];

const ALLOWED_WITH = new Set(['parentOf', 'childOf', 'media', 'profile']);

@Injectable()
export class FamilyMembersService {
  constructor(private prisma: PrismaService) {}

  buildMemberSelect(q?: GetMyTreeQuery): Prisma.FamilyMemberSelect {
    const select: Prisma.FamilyMemberSelect = {};

    const fields = (q?.fields?.length ? q.fields : DEFAULT_FIELDS).filter((f) =>
      ALLOWED_FIELDS.has(f),
    );

    for (const f of new Set(['id', 'role', ...fields])) {
      (select as any)[f] = true;
    }

    const withs = (q?.with ?? []).filter((w) => ALLOWED_WITH.has(w));
    for (const w of withs) {
      if (w === 'parentOf') {
        select.parentOf = { select: { toMemberId: true, type: true } };
      }
      if (w === 'childOf') {
        select.childOf = { select: { fromMemberId: true, type: true } };
      }
      if (w === 'media') {
        select.media = {
          select: { id: true, url: true, type: true, caption: true },
        };
      }
      if (w === 'profile') {
        select.profile = {
          select: {
            bio: true,
            coverMediaUrl: true,
            achievements: true,
            facts: true,
            favorites: true,
            education: true,
            work: true,
            personalInfo: true,
          },
        };
      }
    }

    return select;
  }

  async createFamilyMember(userId: string, dto: CreateFamilyMemberDto) {
    const dobPayload = this.normalizeDobPayload(dto);
    const dodPayload = this.normalizeDodPayload(dto);

    const created = await this.prisma.familyMember.create({
      data: {
        userId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender ?? undefined,
        ...dobPayload,
        ...dodPayload,
        isAlive: dto.isAlive,
        photoUrl: dto.photoUrl,
        role: dto.role.toLowerCase(),
        relationLabel: dto.relationLabel ?? undefined,
        translatedRole: dto.translatedRole ?? undefined,
        partnerId: dto.partnerId ?? undefined,
        partnerStatus: dto.partnerStatus ?? undefined,
      },
    });

    await this.autoPairIfCounterpartExists(userId, created);

    return created;
  }

  async getFamilyMemberByRole(userId: string, role: string) {
    return this.prisma.familyMember.findFirst({
      where: {
        userId,
        role: role.toLowerCase(),
      },
    });
  }

  async updateFamilyMemberByRole(
    userId: string,
    role: string,
    dto: UpdateFamilyMemberDto,
  ) {
    const existing = await this.prisma.familyMember.findFirst({
      where: { userId, role: role.toLowerCase() },
    });
    if (!existing) throw new NotFoundException(`No member with role ${role}`);

    const dobTouched =
      dto.dob !== undefined ||
      dto.birthYear !== undefined ||
      dto.birthNote !== undefined;

    const dobPayload = dobTouched ? this.normalizeDobPayload(dto) : {};

    const dodPayload = this.normalizeDodPayload(dto, true);

    return this.prisma.familyMember.update({
      where: { id: existing.id },
      data: {
        userId,
        role: role.toLowerCase(),
        firstName: dto.firstName ?? existing.firstName,
        middleName: dto.middleName ?? existing.middleName,
        lastName: dto.lastName ?? existing.lastName,
        gender: dto.gender ?? existing.gender,

        ...dobPayload,
        ...dodPayload,

        isAlive:
          dto.isAlive !== undefined && dto.isAlive !== null
            ? dto.isAlive
            : existing.isAlive,

        photoUrl: dto.photoUrl ?? existing.photoUrl,
        relationLabel: dto.relationLabel ?? existing.relationLabel,
        translatedRole: dto.translatedRole ?? existing.translatedRole,

        partnerId:
          dto.partnerId === null ? null : (dto.partnerId ?? existing.partnerId),
        partnerStatus:
          dto.partnerStatus === null
            ? null
            : (dto.partnerStatus ?? existing.partnerStatus),
      },
    });
  }

  async getAllFamilyMembers(userId: string, q?: GetMyTreeQuery) {
    const select = this.buildMemberSelect(q);
    return this.prisma.familyMember.findMany({
      where: { userId },
      select,
      orderBy: { dob: 'asc' },
    });
  }

  async createRelationship(dto: CreateRelationshipDto) {
    return this.prisma.relationship.create({
      data: {
        fromMemberId: dto.fromMemberId,
        toMemberId: dto.toMemberId,
        type: dto.type,
      },
    });
  }

  async getPagedFamilyMembers(userId: string, dto: GetFamilyPagedDto) {
    const validSortFields = ['firstName', 'lastName', 'dob', 'role'];
    if (!validSortFields.includes(dto.sortField)) {
      throw new BadRequestException(
        `Invalid sortField. Must be one of: ${validSortFields.join(', ')}`,
      );
    }

    const skip = dto.page * dto.size;
    const orderBy: Prisma.FamilyMemberOrderByWithRelationInput = {
      [dto.sortField]: dto.sortOrder,
    };

    const select = this.buildMemberSelect(dto);

    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.familyMember.findMany({
          where: { userId },
          skip,
          take: dto.size,
          orderBy,
          select,
        }),
        this.prisma.familyMember.count({ where: { userId } }),
      ]);

      return { data, total };
    } catch (error) {
      console.error('getPagedFamilyMembers error:', error);
      throw new BadRequestException('Failed to fetch paged family members');
    }
  }

  async setPartner(
    userId: string,
    memberId: string,
    partnerId: string,
    status: PartnerStatus,
  ) {
    const [a, b] = await this.prisma.$transaction([
      this.prisma.familyMember.findFirst({ where: { id: memberId, userId } }),
      this.prisma.familyMember.findFirst({ where: { id: partnerId, userId } }),
    ]);
    if (!a || !b)
      throw new NotFoundException('Member or partner not found for this user');

    await this.prisma.$transaction(async (tx) => {
      // 1) Изчисти всички стари партньорства към тези двама
      await tx.familyMember.updateMany({
        where: { partnerId: { in: [memberId, partnerId] } },
        data: { partnerId: null, partnerStatus: null },
      });

      await tx.relationship.deleteMany({
        where: {
          type: 'partner',
          OR: [
            { fromMemberId: memberId, toMemberId: partnerId },
            { fromMemberId: partnerId, toMemberId: memberId },
            { fromMemberId: memberId },
            { toMemberId: memberId },
            { fromMemberId: partnerId },
            { toMemberId: partnerId },
          ],
        },
      });

      // 2) Сложи двупосочно партньорство
      await tx.familyMember.update({
        where: { id: memberId },
        data: { partnerId, partnerStatus: status },
      });
      await tx.familyMember.update({
        where: { id: partnerId },
        data: { partnerId: memberId, partnerStatus: status },
      });

      // 3) Relationship (единичен ред, без значение посоката)
      const exists = await tx.relationship.findFirst({
        where: {
          type: 'partner',
          OR: [
            { fromMemberId: memberId, toMemberId: partnerId },
            { fromMemberId: partnerId, toMemberId: memberId },
          ],
        },
      });

      if (!exists) {
        await tx.relationship.create({
          data: {
            fromMemberId: memberId,
            toMemberId: partnerId,
            type: 'partner',
          },
        });
      }
    });

    return { ok: true };
  }

  async clearPartner(userId: string, memberId: string) {
    const m = await this.prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!m) throw new NotFoundException();
    if (!m.partnerId) return { ok: true };

    await this.prisma.$transaction([
      this.prisma.familyMember.update({
        where: { id: memberId },
        data: { partnerId: null, partnerStatus: null },
      }),
      this.prisma.familyMember.update({
        where: { id: m.partnerId },
        data: { partnerId: null, partnerStatus: null },
      }),
    ]);
    return { ok: true };
  }

  private normalizeDobPayload(
    dto: CreateFamilyMemberDto | UpdateFamilyMemberDto,
  ) {
    if (dto.dob) {
      return {
        dob: new Date(dto.dob),
        birthYear: null,
        birthNote: null,
      };
    }
    if (typeof dto.birthYear === 'number') {
      return {
        dob: null,
        birthYear: dto.birthYear,
        birthNote: null,
      };
    }
    if (dto.birthNote && dto.birthNote.trim().length) {
      return {
        dob: null,
        birthYear: null,
        birthNote: dto.birthNote.trim(),
      };
    }
    return {
      dob: null,
      birthYear: null,
      birthNote: null,
    };
  }

  private normalizeDodPayload(
    dto: CreateFamilyMemberDto | UpdateFamilyMemberDto,
    forUpdate = false,
  ):
    | {
        dod?: Date | null;
        deathYear?: number | null;
        deathNote?: string | null;
      }
    | {} {
    const touchedOnUpdate =
      forUpdate &&
      !['dod', 'deathYear', 'deathNote', 'isAlive'].some(
        (k) => (dto as any)[k] !== undefined,
      );

    if (touchedOnUpdate) return {};

    if (dto.isAlive === true) {
      return { dod: null, deathYear: null, deathNote: null };
    }

    if (dto.dod) {
      return { dod: new Date(dto.dod), deathYear: null, deathNote: null };
    }

    if (typeof dto.deathYear === 'number') {
      return { dod: null, deathYear: dto.deathYear, deathNote: null };
    }

    if (dto.deathNote && dto.deathNote.trim().length) {
      return { dod: null, deathYear: null, deathNote: dto.deathNote.trim() };
    }

    if (
      dto.dod === null ||
      dto.deathYear === null ||
      dto.deathNote === null ||
      dto.isAlive === false
    ) {
      return { dod: null, deathYear: null, deathNote: null };
    }

    return {};
  }

  private async autoPairIfCounterpartExists(
    userId: string,
    created: { id: string; role: string },
  ) {
    const role = created.role;

    // 1) Core: mother ↔ father
    if (role === 'mother' || role === 'father') {
      const counterpartRole = role === 'mother' ? 'father' : 'mother';
      const other = await this.prisma.familyMember.findFirst({
        where: { userId, role: counterpartRole },
      });
      if (other) {
        await this.setPartner(
          userId,
          created.id,
          other.id,
          PartnerStatus.UNKNOWN,
        );
      }
      return;
    }

    // 2) Динамични: …_mother ↔ …_father
    const idx = role.lastIndexOf('_');
    if (idx === -1) return; // няма суфикс → не е динамична роля

    const suffix = role.slice(idx + 1);
    if (suffix !== 'mother' && suffix !== 'father') return;

    const base = role.slice(0, idx);
    const counterpartRole = `${base}_${suffix === 'mother' ? 'father' : 'mother'}`;

    const other = await this.prisma.familyMember.findFirst({
      where: { userId, role: counterpartRole },
    });

    if (other) {
      await this.setPartner(
        userId,
        created.id,
        other.id,
        PartnerStatus.UNKNOWN,
      );
    }
  }

  async deleteByRole(userId: string, role: string) {
    const existing = await this.prisma.familyMember.findFirst({
      where: { userId, role: role.toLowerCase() },
      select: { id: true, role: true },
    });
    if (!existing) throw new NotFoundException(`No member with role ${role}`);

    if (existing.role === 'owner') {
      throw new BadRequestException('Owner cannot be deleted.');
    }

    const memberId = existing.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.familyMember.updateMany({
        where: { partnerId: memberId },
        data: { partnerId: null, partnerStatus: null },
      });

      await tx.relationship.deleteMany({
        where: {
          OR: [{ fromMemberId: memberId }, { toMemberId: memberId }],
        },
      });

      await tx.memberProfile.deleteMany({ where: { memberId } });

      await tx.media.deleteMany({ where: { memberId } });

      await tx.familyMember.delete({ where: { id: memberId } });
    });

    return { ok: true };
  }
}
