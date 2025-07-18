import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';

@Injectable()
export class FamilyMembersService {
  constructor(private prisma: PrismaService) {}

  async createFamilyMember(userId: string, dto: CreateFamilyMemberDto) {
    return this.prisma.familyMember.create({
      data: {
        userId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        gender: dto.gender ?? undefined,
        dob: new Date(dto.dob),
        dod: dto.dod ? new Date(dto.dod) : undefined,
        isAlive: dto.isAlive,
        photoUrl: dto.photoUrl,
        role: dto.role,
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

    return this.prisma.familyMember.update({
      where: { id: existing.id },
      data: { ...dto, role: role.toLowerCase(), userId },
    });
  }

  async getAllFamilyMembers(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: { dob: 'asc' },
    });
  }

    async createRelationship(dto: CreateRelationshipDto) {
    // Optional: verify both members exist & belong to the user
    return this.prisma.relationship.create({
      data: {
        fromMemberId: dto.fromMemberId,
        toMemberId: dto.toMemberId,
        type: dto.type,
      },
    });
  }
}
