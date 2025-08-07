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

 async getPagedFamilyMembers(userId: string, dto: GetFamilyPagedDto) {
  console.log('getPagedFamilyMembers input:', { userId, dto });

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

    console.log('getPagedFamilyMembers result:', {
      total,
      dataLength: data.length,
    });
    return { data, total };
  } catch (error) {
    console.error('getPagedFamilyMembers error:', error);
    throw new BadRequestException('Failed to fetch paged family members');
  }
}
}
