import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';

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
        gender: dto.gender,
        dob: new Date(dto.dob),
        dod: dto.dod ? new Date(dto.dod) : undefined,
        isAlive: dto.isAlive,
        photoUrl: dto.photoUrl,
        biography: dto.biography,
      },
    });
  }

  async getMyFamily(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
