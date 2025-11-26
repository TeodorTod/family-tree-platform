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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MailerModule } from './mailer/mailer.module';
import { GlobalSearchModule } from './global-search/global-search.module';
import { SharingModule } from './sharing/sharing.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamilyMembersModule,
    MediaModule,
    MailerModule,
    MemberProfilesModule,
    GlobalSearchModule,
    SharingModule,
    BillingModule,
       ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'), 
      serveRoot: '/',                        
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
