import { Module } from '@nestjs/common';
import { MemberProfilesController } from './member-profiles.controller';
import { MemberProfilesService } from './member-profiles.service';

import { MediaModule } from 'src/media/media.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, 
    MediaModule,  
  ],
  controllers: [MemberProfilesController],
  providers: [MemberProfilesService],
 
})
export class MemberProfilesModule {}
