import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { CreateMemberProfileDto } from './dto/create-member-profile.dto';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [x: string]: JsonValue } | JsonValue[];

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

  private toJson(value: unknown): JsonValue | null {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  }

  async getByRole(userId: string, role: string) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    return this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });
  }

  async createByRole(
    userId: string,
    role: string,
    dto: CreateMemberProfileDto,
  ) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    const existing = await this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });
    if (existing)
      throw new BadRequestException(
        'Profile already exists. Use PUT to update.',
      );

    const { stories, notes, ...rest } = dto;

    return this.prisma.memberProfile.create({
      data: {
        member: { connect: { id: member.id } },
        ...rest,
        ...(stories !== undefined
          ? { stories: this.toJson(stories) as any }
          : {}),
        ...(notes !== undefined ? { notes: this.toJson(notes) as any } : {}),
      },
    });
  }

  async updateByRole(
    userId: string,
    role: string,
    dto: UpdateMemberProfileDto,
  ) {
    const member = await this.getMemberByRoleOrThrow(userId, role);
    const existing = await this.prisma.memberProfile.findUnique({
      where: { memberId: member.id },
    });

    const { stories, notes, ...rest } = dto;

    if (!existing) {
      return this.prisma.memberProfile.create({
        data: {
          member: { connect: { id: member.id } },
          ...rest,
          ...(stories !== undefined
            ? { stories: this.toJson(stories) as any }
            : {}),
          ...(notes !== undefined ? { notes: this.toJson(notes) as any } : {}),
        },
      });
    }

    return this.prisma.memberProfile.update({
      where: { memberId: member.id },
      data: {
        ...rest,
        ...(stories !== undefined
          ? { stories: this.toJson(stories) as any }
          : {}),
        ...(notes !== undefined ? { notes: this.toJson(notes) as any } : {}),
      },
    });
  }
}
