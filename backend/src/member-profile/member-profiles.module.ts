import { Module } from '@nestjs/common';
import { MemberProfilesController } from './member-profiles.controller';
import { MemberProfilesService } from './member-profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MemberProfilesController],
  providers: [MemberProfilesService, PrismaService],
  exports: [MemberProfilesService],
})
export class MemberProfilesModule {}
