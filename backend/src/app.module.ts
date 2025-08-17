import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FamilyMembersModule } from './family-members/family-members.module';
import { MediaModule } from './media/media.module';
import { MemberProfilesModule } from './member-profile/member-profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamilyMembersModule,
    MediaModule,
    MemberProfilesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
