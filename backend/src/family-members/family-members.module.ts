import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FamilyMembersController } from './family-members.controller';
import { FamilyMembersService } from './family-members.service';
import { RelationshipService } from 'src/relationships/relationship.service';


@Module({
  imports: [PrismaModule],
  controllers: [FamilyMembersController],
  providers: [FamilyMembersService, RelationshipService],
})
export class FamilyMembersModule {}
