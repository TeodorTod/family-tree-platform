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

@Injectable()
export class FamilyMembersService {
  constructor(private prisma: PrismaService) {}

  async createFamilyMember(userId: string, dto: CreateFamilyMemberDto) {
    const dobPayload = this.normalizeDobPayload(dto);
    return this.prisma.familyMember.create({
      data: {
        userId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender ?? undefined,
        ...dobPayload,
        dod: dto.dod ? new Date(dto.dod) : undefined,
        isAlive: dto.isAlive,
        photoUrl: dto.photoUrl,
        role: dto.role.toLowerCase(),
        relationLabel: dto.relationLabel ?? undefined,
        translatedRole: dto.translatedRole ?? undefined,
        partnerId: dto.partnerId ?? undefined,
        partnerStatus: dto.partnerStatus ?? undefined,
      },
    });
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

    const dobPayload =
      dto.dob !== undefined ||
      dto.birthYear !== undefined ||
      dto.birthNote !== undefined
        ? this.normalizeDobPayload(dto)
        : {};

    return this.prisma.familyMember.update({
      where: { id: existing.id },
      data: {
        userId,
        role: role.toLowerCase(),
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender,
        ...dobPayload,
        dod: dto.dod ? new Date(dto.dod) : dto.dod === null ? null : undefined,
        isAlive: dto.isAlive,
        photoUrl: dto.photoUrl,
        relationLabel: dto.relationLabel ?? existing.relationLabel,
        translatedRole: dto.translatedRole ?? existing.translatedRole,
        partnerId: dto.partnerId ?? null,
        partnerStatus: dto.partnerStatus ?? null,
      },
    });
  }

  async getAllFamilyMembers(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
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
    const orderBy = {
      [dto.sortField]: dto.sortOrder,
    };

    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.familyMember.findMany({
          where: { userId },
          skip,
          take: dto.size,
          orderBy,
        }),
        this.prisma.familyMember.count({
          where: { userId },
        }),
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
      await tx.familyMember.updateMany({
        where: { partnerId: { in: [memberId, partnerId] } },
        data: { partnerId: null, partnerStatus: null },
      });

      await tx.familyMember.update({
        where: { id: memberId },
        data: { partnerId, partnerStatus: status },
      });
      await tx.familyMember.update({
        where: { id: partnerId },
        data: { partnerId: memberId, partnerStatus: status },
      });
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
}
