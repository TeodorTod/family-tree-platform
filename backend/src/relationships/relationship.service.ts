import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationshipService {
  constructor(private readonly prisma: PrismaService) {}

  async createParentChildRelation(fromId: string, toId: string) {
    return this.prisma.relationship.create({
      data: {
        fromMemberId: fromId,
        toMemberId: toId,
        type: 'parent',
      },
    });
  }
}
