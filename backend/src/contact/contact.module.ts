import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { RecaptchaModule } from '../recaptcha/recaptcha.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [RecaptchaModule, ConfigModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}

