import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberProfileDto } from './dto/create-member-profile.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';

@Injectable()
export class MemberProfilesService {
  constructor(private prisma: PrismaService) {}

  private async getMemberByRoleOrThrow(userId: string, role: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, role: role.toLowerCase() },
    });
    if (!member) throw new NotFoundException(`No member with role ${role}`);
    return member;
  }

  async getByRole(userId: string, role: string) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    return this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });
  }

  async createByRole(userId: string, role: string, dto: CreateMemberProfileDto) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    const existing = await this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });
    if (existing) {
      throw new BadRequestException('Profile already exists. Use PUT to update.');
    }
    return this.prisma.memberProfile.create({
      data: { memberId: member.id, ...dto },
    });
  }

  async updateByRole(userId: string, role: string, dto: UpdateMemberProfileDto) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    const existing = await this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });
    if (!existing) {
      // Upsert-friendly behavior: create if missing
      return this.prisma.memberProfile.create({
        data: { memberId: member.id, ...dto },
      });
    }
    return this.prisma.memberProfile.update({
      where: { memberId: member.id },
      data: { ...dto },
    });
  }
}
